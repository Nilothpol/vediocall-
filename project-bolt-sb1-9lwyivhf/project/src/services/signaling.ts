import { supabase, User, CallSession, SignalingMessage } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export class SignalingService {
  private signalingChannel: RealtimeChannel | null = null;
  private currentUserId: string | null = null;

  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    return data;
  }

  async createOrUpdateUser(username: string): Promise<User> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    this.currentUserId = user.id;

    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        username,
        is_online: true,
        last_seen: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async setOnlineStatus(isOnline: boolean): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('users')
      .update({
        is_online: isOnline,
        last_seen: new Date().toISOString(),
      })
      .eq('id', user.id);
  }

  async getOnlineUsers(): Promise<User[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('is_online', true)
      .neq('id', user.id)
      .order('username');

    if (error) throw error;
    return data || [];
  }

  async createCallSession(receiverId: string): Promise<CallSession> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('call_sessions')
      .insert({
        caller_id: user.id,
        receiver_id: receiverId,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateCallStatus(sessionId: string, status: 'pending' | 'active' | 'ended'): Promise<void> {
    const updates: any = { status };

    if (status === 'active') {
      updates.started_at = new Date().toISOString();
    } else if (status === 'ended') {
      updates.ended_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('call_sessions')
      .update(updates)
      .eq('id', sessionId);

    if (error) throw error;
  }

  async sendSignal(
    sessionId: string,
    toUserId: string,
    messageType: 'offer' | 'answer' | 'ice-candidate',
    payload: any
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('signaling_messages')
      .insert({
        session_id: sessionId,
        from_user_id: user.id,
        to_user_id: toUserId,
        message_type: messageType,
        payload,
      });

    if (error) throw error;
  }

  subscribeToSignals(
    onSignal: (message: SignalingMessage) => void,
    onIncomingCall?: (session: CallSession) => void
  ): void {
    if (this.signalingChannel) {
      this.signalingChannel.unsubscribe();
    }

    this.signalingChannel = supabase.channel('signaling');

    this.signalingChannel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signaling_messages',
          filter: `to_user_id=eq.${this.currentUserId}`,
        },
        (payload) => {
          onSignal(payload.new as SignalingMessage);
        }
      )
      .subscribe();

    if (onIncomingCall) {
      supabase.channel('incoming_calls')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'call_sessions',
            filter: `receiver_id=eq.${this.currentUserId}`,
          },
          (payload) => {
            onIncomingCall(payload.new as CallSession);
          }
        )
        .subscribe();
    }
  }

  unsubscribe(): void {
    if (this.signalingChannel) {
      this.signalingChannel.unsubscribe();
      this.signalingChannel = null;
    }
  }

  async cleanup(): Promise<void> {
    await this.setOnlineStatus(false);
    this.unsubscribe();
  }
}
