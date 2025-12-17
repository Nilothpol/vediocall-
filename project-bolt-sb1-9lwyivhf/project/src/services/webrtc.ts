export interface WebRTCConfig {
  iceServers: RTCIceServer[];
}

export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private onRemoteStreamCallback?: (stream: MediaStream) => void;
  private onIceCandidateCallback?: (candidate: RTCIceCandidate) => void;
  private onConnectionStateChangeCallback?: (state: RTCPeerConnectionState) => void;

  private config: WebRTCConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  async initializeLocalStream(videoEnabled = true, audioEnabled = true): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: videoEnabled ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        } : false,
        audio: audioEnabled ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } : false,
      });
      return this.localStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }

  createPeerConnection(): RTCPeerConnection {
    this.peerConnection = new RTCPeerConnection(this.config);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidateCallback) {
        this.onIceCandidateCallback(event.candidate);
      }
    };

    this.peerConnection.ontrack = (event) => {
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
      }
      event.streams[0].getTracks().forEach((track) => {
        this.remoteStream?.addTrack(track);
      });
      if (this.onRemoteStreamCallback && this.remoteStream) {
        this.onRemoteStreamCallback(this.remoteStream);
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection && this.onConnectionStateChangeCallback) {
        this.onConnectionStateChangeCallback(this.peerConnection.connectionState);
      }
    };

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        if (this.peerConnection && this.localStream) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });
    }

    return this.peerConnection;
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });

    const modifiedOffer = this.prioritizeCodecs(offer, ['VP9', 'AV1', 'VP8', 'H264']);
    await this.peerConnection.setLocalDescription(modifiedOffer);

    return modifiedOffer;
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    const answer = await this.peerConnection.createAnswer();
    const modifiedAnswer = this.prioritizeCodecs(answer, ['VP9', 'AV1', 'VP8', 'H264']);
    await this.peerConnection.setLocalDescription(modifiedAnswer);

    return modifiedAnswer;
  }

  async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(description));
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }
    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  private prioritizeCodecs(
    description: RTCSessionDescriptionInit,
    preferredCodecs: string[]
  ): RTCSessionDescriptionInit {
    if (!description.sdp) return description;

    const sdpLines = description.sdp.split('\r\n');
    const mLineIndex = sdpLines.findIndex(line => line.startsWith('m=video'));

    if (mLineIndex === -1) return description;

    const mLine = sdpLines[mLineIndex];
    const codecPayloadTypes: Map<string, string> = new Map();

    sdpLines.forEach(line => {
      preferredCodecs.forEach(codec => {
        const regex = new RegExp(`a=rtpmap:(\\d+) ${codec}/`, 'i');
        const match = line.match(regex);
        if (match) {
          codecPayloadTypes.set(codec, match[1]);
        }
      });
    });

    const mLineParts = mLine.split(' ');
    const existingPayloadTypes = mLineParts.slice(3);
    const reorderedPayloadTypes: string[] = [];

    preferredCodecs.forEach(codec => {
      const payloadType = codecPayloadTypes.get(codec);
      if (payloadType && existingPayloadTypes.includes(payloadType)) {
        reorderedPayloadTypes.push(payloadType);
      }
    });

    existingPayloadTypes.forEach(pt => {
      if (!reorderedPayloadTypes.includes(pt)) {
        reorderedPayloadTypes.push(pt);
      }
    });

    mLineParts.splice(3, existingPayloadTypes.length, ...reorderedPayloadTypes);
    sdpLines[mLineIndex] = mLineParts.join(' ');

    return {
      ...description,
      sdp: sdpLines.join('\r\n'),
    };
  }

  toggleAudio(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  onRemoteStream(callback: (stream: MediaStream) => void): void {
    this.onRemoteStreamCallback = callback;
  }

  onIceCandidate(callback: (candidate: RTCIceCandidate) => void): void {
    this.onIceCandidateCallback = callback;
  }

  onConnectionStateChange(callback: (state: RTCPeerConnectionState) => void): void {
    this.onConnectionStateChangeCallback = callback;
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  getConnectionState(): RTCPeerConnectionState | null {
    return this.peerConnection?.connectionState || null;
  }

  cleanup(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;
    this.onRemoteStreamCallback = undefined;
    this.onIceCandidateCallback = undefined;
    this.onConnectionStateChangeCallback = undefined;
  }
}
