'use client';

import { useState, useRef, useEffect } from 'react';
import { Phone, PhoneOff, Mic, MicOff } from 'lucide-react';
import { User } from '@/src/types/types';
import { supabase } from '@/src/lib/supabase';
import { cn } from '@/src/lib/utils';
import { Button } from '../ui/button';

interface VoiceChatProps {
  sessionId: string;
  user: User;
}

type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected';

export function VoiceChat({ sessionId, user }: VoiceChatProps) {
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const voiceChannelRef = useRef<any>(null);

  useEffect(() => {
    // Voice chat signaling channel
    const voiceChannel = supabase.channel(`voice-${sessionId}`);
    voiceChannelRef.current = voiceChannel;

    voiceChannel
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (payload.from !== user.id) {
          setCallStatus('ringing');
          setTimeout(() => handleAcceptCall(payload.offer), 500);
        }
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (payload.from !== user.id && peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(payload.answer)
          );
          setCallStatus('connected');
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload.from !== user.id && peerConnectionRef.current) {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(payload.candidate)
          );
        }
      })
      .on('broadcast', { event: 'end-call' }, ({ payload }) => {
        if (payload.from !== user.id) {
          endCall();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(voiceChannel);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, [sessionId, user.id]);

  const createPeerConnection = () => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    };

    const pc = new RTCPeerConnection(configuration);

    pc.onicecandidate = (event) => {
      if (event.candidate && voiceChannelRef.current) {
        voiceChannelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: { candidate: event.candidate, from: user.id }
        });
      }
    };

    pc.ontrack = (event) => {
      const audio = new Audio();
      audio.srcObject = event.streams[0];
      audio.play();
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCallStatus('connected');
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        endCall();
      }
    };

    return pc;
  };

  const startCall = async () => {
    try {
      setCallStatus('calling');

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const pc = createPeerConnection();
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (voiceChannelRef.current) {
        voiceChannelRef.current.send({
          type: 'broadcast',
          event: 'offer',
          payload: { offer, from: user.id }
        });
      }

      setIsInCall(true);
    } catch (error) {
      console.error('Error starting call:', error);
      alert('Не удалось получить доступ к микрофону. Проверьте разрешения браузера.');
      setCallStatus('idle');
    }
  };

  const handleAcceptCall = async (offer: RTCSessionDescriptionInit) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const pc = createPeerConnection();
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (voiceChannelRef.current) {
        voiceChannelRef.current.send({
          type: 'broadcast',
          event: 'answer',
          payload: { answer, from: user.id }
        });
      }

      setIsInCall(true);
      setCallStatus('connected');
    } catch (error) {
      console.error('Error accepting call:', error);
      alert('Не удалось подключиться к звонку');
      setCallStatus('idle');
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const endCall = () => {
    if (isInCall && voiceChannelRef.current) {
      voiceChannelRef.current.send({
        type: 'broadcast',
        event: 'end-call',
        payload: { from: user.id }
      });
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setIsInCall(false);
    setIsMuted(false);
    setCallStatus('idle');
  };

  return (
    <div className="flex items-center gap-2">
      {/* Call status indicator */}
      {callStatus !== 'idle' && (
        <div className={cn(
          "px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2",
          callStatus === 'connected' 
            ? "bg-green-500/20 text-green-400 border border-green-500/30" 
            : "bg-purple-500/20 text-purple-400 border border-purple-500/30"
        )}>
          <div className={cn(
            "w-2 h-2 rounded-full",
            callStatus === 'connected' ? "bg-green-400" : "bg-purple-400 animate-pulse"
          )} />
          {callStatus === 'calling' && 'Вызов...'}
          {callStatus === 'ringing' && 'Входящий звонок...'}
          {callStatus === 'connected' && (isMuted ? 'В эфире (без звука)' : 'В эфире')}
        </div>
      )}

      {/* Controls */}
      {!isInCall ? (
        <Button
          onClick={startCall}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Phone className="h-4 w-4 mr-2" />
          Голосовой чат
        </Button>
      ) : (
        <>
          <Button
            onClick={toggleMute}
            variant="outline"
            size="icon"
            className={cn(
              "border-gray-700",
              isMuted 
                ? "bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/50" 
                : "bg-gray-800 hover:bg-gray-700 text-white"
            )}
            title={isMuted ? 'Включить микрофон' : 'Выключить микрофон'}
          >
            {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>

          <Button
            onClick={endCall}
            variant="outline"
            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/50"
          >
            <PhoneOff className="h-4 w-4 mr-2" />
            Завершить
          </Button>
        </>
      )}
    </div>
  );
}

