import { useState, useEffect, useCallback } from 'react';
import { supabase, User, CallSession, SignalingMessage } from './lib/supabase';
import { WebRTCService } from './services/webrtc';
import { SignalingService } from './services/signaling';
import { Auth } from './components/Auth';
import { UserList } from './components/UserList';
import { VideoCall } from './components/VideoCall';
import { IncomingCall } from './components/IncomingCall';
import { LogOut } from 'lucide-react';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [inCall, setInCall] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callStatus, setCallStatus] = useState('Connecting...');
  const [incomingCall, setIncomingCall] = useState<{ session: CallSession; caller: User } | null>(null);
  const [currentSession, setCurrentSession] = useState<CallSession | null>(null);
  const [remoteUser, setRemoteUser] = useState<User | null>(null);

  const webrtcService = useState(() => new WebRTCService())[0];
  const signalingService = useState(() => new SignalingService())[0];

  useEffect(() => {
    checkAuth();
    return () => {
      cleanup();
    };
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setIsAuthenticated(true);
      await initializeUser();
    }
  };

  const initializeUser = async () => {
    const user = await signalingService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      await signalingService.setOnlineStatus(true);
      loadOnlineUsers();
      setupSignaling();
      startPresencePolling();
    }
  };

  const startPresencePolling = () => {
    const interval = setInterval(async () => {
      await signalingService.setOnlineStatus(true);
      loadOnlineUsers();
    }, 30000);

    return () => clearInterval(interval);
  };

  const loadOnlineUsers = async () => {
    const users = await signalingService.getOnlineUsers();
    setOnlineUsers(users);
  };

  const setupSignaling = () => {
    signalingService.subscribeToSignals(
      handleSignalMessage,
      handleIncomingCall
    );
  };

  const handleIncomingCall = async (session: CallSession) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.caller_id)
      .maybeSingle();

    if (data) {
      setIncomingCall({ session, caller: data });
    }
  };

  const handleSignalMessage = async (message: SignalingMessage) => {
    if (message.message_type === 'offer') {
      await webrtcService.setRemoteDescription(message.payload);
    } else if (message.message_type === 'answer') {
      await webrtcService.setRemoteDescription(message.payload);
      setCallStatus('Connected');
    } else if (message.message_type === 'ice-candidate') {
      await webrtcService.addIceCandidate(message.payload);
    }
  };

  const handleAuthSuccess = async (username: string) => {
    await signalingService.createOrUpdateUser(username);
    setIsAuthenticated(true);
    await initializeUser();
  };

  const handleCallUser = async (user: User) => {
    setRemoteUser(user);
    setCallStatus('Initializing call...');
    setInCall(true);

    const stream = await webrtcService.initializeLocalStream();
    setLocalStream(stream);

    const session = await signalingService.createCallSession(user.id);
    setCurrentSession(session);

    webrtcService.createPeerConnection();

    webrtcService.onRemoteStream((stream) => {
      setRemoteStream(stream);
      setCallStatus('Connected');
    });

    webrtcService.onIceCandidate(async (candidate) => {
      await signalingService.sendSignal(
        session.id,
        user.id,
        'ice-candidate',
        candidate.toJSON()
      );
    });

    webrtcService.onConnectionStateChange((state) => {
      if (state === 'connected') {
        setCallStatus('Connected');
        signalingService.updateCallStatus(session.id, 'active');
      } else if (state === 'disconnected' || state === 'failed') {
        handleEndCall();
      }
    });

    const offer = await webrtcService.createOffer();
    await signalingService.sendSignal(session.id, user.id, 'offer', offer);
    setCallStatus('Calling...');
  };

  const handleAcceptCall = async () => {
    if (!incomingCall) return;

    setRemoteUser(incomingCall.caller);
    setCurrentSession(incomingCall.session);
    setInCall(true);
    setCallStatus('Connecting...');
    setIncomingCall(null);

    const stream = await webrtcService.initializeLocalStream();
    setLocalStream(stream);

    webrtcService.createPeerConnection();

    webrtcService.onRemoteStream((stream) => {
      setRemoteStream(stream);
      setCallStatus('Connected');
    });

    webrtcService.onIceCandidate(async (candidate) => {
      await signalingService.sendSignal(
        incomingCall.session.id,
        incomingCall.caller.id,
        'ice-candidate',
        candidate.toJSON()
      );
    });

    webrtcService.onConnectionStateChange((state) => {
      if (state === 'connected') {
        setCallStatus('Connected');
        signalingService.updateCallStatus(incomingCall.session.id, 'active');
      } else if (state === 'disconnected' || state === 'failed') {
        handleEndCall();
      }
    });

    const answer = await webrtcService.createAnswer();
    await signalingService.sendSignal(
      incomingCall.session.id,
      incomingCall.caller.id,
      'answer',
      answer
    );
  };

  const handleRejectCall = async () => {
    if (incomingCall) {
      await signalingService.updateCallStatus(incomingCall.session.id, 'ended');
      setIncomingCall(null);
    }
  };

  const handleEndCall = async () => {
    if (currentSession) {
      await signalingService.updateCallStatus(currentSession.id, 'ended');
    }
    cleanup();
  };

  const handleToggleAudio = (enabled: boolean) => {
    webrtcService.toggleAudio(enabled);
  };

  const handleToggleVideo = (enabled: boolean) => {
    webrtcService.toggleVideo(enabled);
  };

  const cleanup = () => {
    webrtcService.cleanup();
    setInCall(false);
    setLocalStream(null);
    setRemoteStream(null);
    setCurrentSession(null);
    setRemoteUser(null);
    setCallStatus('Connecting...');
  };

  const handleLogout = async () => {
    await signalingService.cleanup();
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setOnlineUsers([]);
    cleanup();
  };

  if (!isAuthenticated) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Video Call App</h1>
              <p className="text-gray-600 mt-1">
                Welcome, {currentUser?.username}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>

        <UserList users={onlineUsers} onCallUser={handleCallUser} />
      </div>

      {inCall && (
        <VideoCall
          localStream={localStream}
          remoteStream={remoteStream}
          onToggleAudio={handleToggleAudio}
          onToggleVideo={handleToggleVideo}
          onEndCall={handleEndCall}
          callStatus={callStatus}
          remoteUsername={remoteUser?.username}
        />
      )}

      {incomingCall && (
        <IncomingCall
          callerName={incomingCall.caller.username}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}
    </div>
  );
}

export default App;
