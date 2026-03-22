'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Send } from 'lucide-react';
import { Message, Profile, StudySession, User } from '@/src/types/types';
import { supabase } from '@/src/lib/supabase';
import { Header } from '@/src/components/layout/Header';
import { Button } from '@/src/components/ui/button';
import { VoiceChat } from '@/src/components/layout/VoiceChat';
import { ChatMessage } from '@/src/components/layout/ChatMessage';
import { Input } from '@/src/components/ui/input';

export default function SessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<StudySession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkUser();
    loadSession();
  }, [sessionId]);

  useEffect(() => {
    if (session) {
      loadMessages();
      
      // Realtime подписка
      const channel = supabase
        .channel(`session-${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'session_messages',
            filter: `session_id=eq.${sessionId}`
          },
          async (payload) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', payload.new.user_id)
              .single();

            setMessages((current) => [...current, { ...payload.new, profiles: profile } as Message]);
          }
        )
        .subscribe();

      // Cleanup при размонтировании
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [session, sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      router.push('/auth');
      return;
    }

    setUser(session.user as User);
    loadProfile(session.user.id);
  };

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) setProfile(data);
  };

  const loadSession = async () => {
    const { data } = await supabase
      .from('study_sessions')
      .select('*, study_listings(*)')
      .eq('id', sessionId)
      .single();

    if (data) {
      setSession(data);
    } else {
      router.push('/');
    }
  };

  const loadMessages = async () => {
    const { data } = await supabase
      .from('session_messages')
      .select('*, profiles(*)')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (data) setMessages(data);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const { error } = await supabase
      .from('session_messages')
      .insert([{
        session_id: sessionId,
        user_id: user.id,
        content: newMessage.trim()
      }]);

    if (!error) {
      setNewMessage('');
    }
  };

  if (!session || !user) {
    return (
      <div className="min-h-screen bg-[#1B1B1C] flex items-center justify-center">
        <div className="text-white text-lg">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1B1B1C] flex flex-col">
      <Header user={user} profile={profile} />

      <main className="flex-1 container mx-auto px-4 py-8 flex flex-col max-w-5xl">
        {/* Session header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/')}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl font-bold text-white">
                {session.study_listings?.title}
              </h1>
            </div>
            <p className="text-purple-400 font-medium ml-11">
              {session.study_listings?.subject}
            </p>
          </div>

          <VoiceChat sessionId={sessionId} user={user} />
        </div>

        {/* Chat area */}
        <div className="flex-1 bg-gray-900 rounded-lg border border-gray-800 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-2">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">
                  Начните общение с вашим напарником! 💬
                </p>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    isOwnMessage={msg.user_id === user.id}
                  />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={sendMessage}
            className="p-4 border-t border-gray-800 bg-gray-900"
          >
            <div className="flex gap-2">
              <Input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Напишите сообщение..."
                className="flex-1 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
              <Button
                type="submit"
                disabled={!newMessage.trim()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}