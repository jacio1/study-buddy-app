'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { User } from '@/src/types/types';
import { supabase } from '@/src/lib/supabase';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';

interface SharedNotesProps {
  sessionId: string;
  user: User;
}

interface SessionNote {
  id: string;
  session_id: string;
  content: string;
  updated_at: string;
  updated_by: string;
}

export function SharedNotes({ sessionId, user }: SharedNotesProps) {
  const [notes, setNotes] = useState('');
  const [noteId, setNoteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    loadNotes();
    const cleanup = subscribeToNotes();
    return cleanup;
  }, [sessionId]);

  const loadNotes = async () => {
    const { data } = await supabase
      .from('session_notes')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (data) {
      setNotes(data.content || '');
      setNoteId(data.id);
      setLastSaved(new Date(data.updated_at));
    }
  };

  const subscribeToNotes = () => {
    const channel = supabase
      .channel(`notes-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'session_notes',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          if (payload.new.updated_by !== user.id) {
            setNotes(payload.new.content || '');
            setLastSaved(new Date(payload.new.updated_at));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const saveNotes = async () => {
    setSaving(true);

    try {
      if (noteId) {
        // Обновление существующих заметок
        await supabase
          .from('session_notes')
          .update({ content: notes })
          .eq('id', noteId);
      } else {
        // Создание новых заметок
        const { data } = await supabase
          .from('session_notes')
          .insert([{
            session_id: sessionId,
            content: notes,
            updated_by: user.id
          }])
          .select()
          .single();

        if (data) setNoteId(data.id);
      }

      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving notes:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Общие заметки</h3>
          {lastSaved && (
            <p className="text-xs text-muted-foreground">
              Сохранено: {lastSaved.toLocaleTimeString('ru-RU')}
            </p>
          )}
        </div>
        <Button
          onClick={saveNotes}
          disabled={saving}
          size="sm"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Сохранение...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Сохранить
            </>
          )}
        </Button>
      </div>

      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Записывайте важные моменты, ключевые идеи, формулы..."
        className="flex-1 resize-none min-h-75"
      />

      <p className="text-xs text-muted-foreground mt-2">
        💡 Заметки синхронизируются между вами и вашим напарником в реальном времени
      </p>
    </div>
  );
}