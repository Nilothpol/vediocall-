# Video Call Application

A high-quality peer-to-peer video calling application built with WebRTC, featuring VP9/AV1 codec support for efficient bandwidth usage and superior video quality.

## Features

- **High-Quality Video**: Utilizes VP9/AV1 codecs for optimal video quality with reduced bandwidth consumption
- **Peer-to-Peer Calling**: Direct connection between 2 users for low-latency video calls
- **Real-time Signaling**: Uses Supabase Realtime for instant signaling between peers
- **User Presence**: Shows online/offline status of users in real-time
- **Call Controls**: Mute/unmute audio, toggle video on/off, and end call
- **Incoming Call Notifications**: Accept or decline incoming calls
- **Secure Authentication**: Email/password authentication with Supabase Auth
- **Responsive UI**: Clean, modern interface that works across devices

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **WebRTC**: Native WebRTC API with custom codec prioritization
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Supabase Realtime for signaling
- **Authentication**: Supabase Auth
- **Icons**: Lucide React

## How It Works

### Video Codec Prioritization

The application automatically prioritizes video codecs in the following order:
1. **VP9** - Google's open-source codec, excellent quality-to-bandwidth ratio
2. **AV1** - Next-generation codec, even better compression than VP9
3. **VP8** - Fallback for older browsers
4. **H.264** - Universal fallback for maximum compatibility

The codec selection happens automatically during the WebRTC negotiation phase. The application modifies the SDP (Session Description Protocol) to prioritize these efficient codecs, resulting in:
- Up to 30-50% less bandwidth usage compared to H.264
- Better video quality at lower bitrates
- Reduced latency in network-constrained environments

### Architecture

1. **Authentication Layer**: Users sign up/login using email and password
2. **User Management**: Tracks online status and presence
3. **Signaling**: Uses Supabase Realtime to exchange WebRTC offers, answers, and ICE candidates
4. **WebRTC Connection**: Establishes peer-to-peer connection with optimized codec selection
5. **Call Management**: Handles call states, incoming calls, and call termination

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase project (database is already configured)

### Installation

1. Install dependencies:
```bash
npm install
```

2. The `.env` file is already configured with your Supabase credentials

### Running the Application

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

## Usage Guide

### First-Time Setup

1. **Sign Up**: Create an account with email and password
2. **Set Username**: Choose a display name for your profile
3. **Grant Permissions**: Allow camera and microphone access when prompted

### Making a Call

1. **View Online Users**: You'll see a list of currently online users
2. **Initiate Call**: Click the "Call" button next to any online user
3. **Wait for Answer**: The other user will receive an incoming call notification
4. **Start Talking**: Once accepted, the video call begins

### Receiving a Call

1. **Incoming Call**: A modal will appear showing who's calling
2. **Accept or Decline**: Choose to accept or decline the call
3. **Grant Permissions**: Allow camera/microphone access if prompted

### During a Call

- **Mute/Unmute**: Click the microphone icon to toggle audio
- **Video On/Off**: Click the camera icon to toggle video
- **End Call**: Click the red phone icon to terminate the call
- **View Participants**: Your video appears in the top-right corner, remote user fills the screen

## Database Schema

### Users Table
- Stores user information and online status
- Tracks last seen timestamp
- Row Level Security enabled

### Call Sessions Table
- Tracks active and historical calls
- Stores caller, receiver, and call status
- Enables call history and analytics

### Signaling Messages Table
- Stores WebRTC signaling data
- Handles offers, answers, and ICE candidates
- Automatically cleaned up after call ends

## Technical Details

### WebRTC Configuration

The application uses STUN servers for NAT traversal:
- `stun:stun.l.google.com:19302`
- `stun:stun1.l.google.com:19302`

For production use in restricted networks, consider adding TURN servers.

### Media Constraints

- **Video**: 1280x720 @ 30fps (ideal)
- **Audio**: Echo cancellation, noise suppression, auto gain control enabled

### Codec Selection

The SDP modification process:
1. Parses the session description
2. Identifies available video codecs
3. Reorders codec list to prioritize VP9/AV1
4. Maintains fallback options for compatibility

## Browser Compatibility

- **Chrome/Edge 90+**: Full support (VP9, AV1)
- **Firefox 90+**: Full support (VP9)
- **Safari 15+**: Limited support (H.264 fallback)
- **Mobile Browsers**: WebRTC support varies

## Security Considerations

- All signaling data is secured with Row Level Security
- Users can only see their own calls and messages
- Authentication required for all operations
- Media streams are encrypted end-to-end by WebRTC (DTLS-SRTP)

## Performance Tips

1. **Network**: Use wired connection for best quality
2. **Bandwidth**: VP9/AV1 requires 1-3 Mbps for HD quality
3. **CPU**: AV1 encoding can be CPU-intensive on older devices
4. **Browser**: Use Chrome/Edge for best codec support

## Troubleshooting

### Camera/Microphone Not Working
- Check browser permissions
- Ensure devices are not in use by another application
- Try refreshing the page

### Call Not Connecting
- Verify both users are online
- Check network connectivity
- Ensure firewall allows WebRTC traffic

### Poor Video Quality
- Check network bandwidth
- Close other bandwidth-intensive applications
- Try disabling video and using audio-only

## Future Enhancements

- Screen sharing capability
- Group video calls (3+ participants)
- Recording functionality
- Chat messaging during calls
- Call history and analytics
- Custom TURN server configuration

## License

MIT
