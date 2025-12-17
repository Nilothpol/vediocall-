/*
  # Video Call Application Schema

  1. New Tables
    - `users`
      - `id` (uuid, primary key) - Unique user identifier
      - `username` (text, unique) - User's display name
      - `is_online` (boolean) - Online status
      - `created_at` (timestamptz) - Account creation timestamp
      - `last_seen` (timestamptz) - Last activity timestamp
    
    - `call_sessions`
      - `id` (uuid, primary key) - Unique call session identifier
      - `caller_id` (uuid, foreign key) - User initiating the call
      - `receiver_id` (uuid, foreign key) - User receiving the call
      - `status` (text) - Call status: 'pending', 'active', 'ended'
      - `started_at` (timestamptz) - Call start time
      - `ended_at` (timestamptz) - Call end time
      - `created_at` (timestamptz) - Session creation timestamp
    
    - `signaling_messages`
      - `id` (uuid, primary key) - Unique message identifier
      - `session_id` (uuid, foreign key) - Associated call session
      - `from_user_id` (uuid, foreign key) - Sender
      - `to_user_id` (uuid, foreign key) - Recipient
      - `message_type` (text) - Type: 'offer', 'answer', 'ice-candidate'
      - `payload` (jsonb) - Message data (SDP or ICE candidate)
      - `created_at` (timestamptz) - Message timestamp

  2. Security
    - Enable RLS on all tables
    - Users can read all users (for selection)
    - Users can update their own profile
    - Users can read call sessions they're part of
    - Users can create calls where they are the caller
    - Users can read/create signaling messages for their calls
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  is_online boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  last_seen timestamptz DEFAULT now()
);

-- Create call_sessions table
CREATE TABLE IF NOT EXISTS call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'ended')),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create signaling_messages table
CREATE TABLE IF NOT EXISTS signaling_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_type text NOT NULL CHECK (message_type IN ('offer', 'answer', 'ice-candidate')),
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE signaling_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for call_sessions table
CREATE POLICY "Users can view their call sessions"
  ON call_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create calls as caller"
  ON call_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Users can update their call sessions"
  ON call_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- RLS Policies for signaling_messages table
CREATE POLICY "Users can view their signaling messages"
  ON signaling_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can create signaling messages"
  ON signaling_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = from_user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_online ON users(is_online);
CREATE INDEX IF NOT EXISTS idx_call_sessions_caller ON call_sessions(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_receiver ON call_sessions(receiver_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_status ON call_sessions(status);
CREATE INDEX IF NOT EXISTS idx_signaling_session ON signaling_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_signaling_to_user ON signaling_messages(to_user_id);