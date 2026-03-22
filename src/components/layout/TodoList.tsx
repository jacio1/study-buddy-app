'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { User } from '@/src/types/types';
import { supabase } from '@/src/lib/supabase';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { cn } from '@/src/lib/utils';
import { Checkbox } from '../ui/checkbox';

interface TodoListProps {
  sessionId: string;
  user: User;
}

interface Todo {
  id: string;
  session_id: string;
  title: string;
  completed: boolean;
  created_by: string;
  created_at: string;
  completed_at: string | null;
  completed_by: string | null;
}

export function TodoList({ sessionId, user }: TodoListProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTodos();
    subscribeToTodos();
  }, [sessionId]);

  const loadTodos = async () => {
    const { data } = await supabase
      .from('session_todos')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (data) setTodos(data);
  };

  const subscribeToTodos = () => {
    const channel = supabase
      .channel(`todos-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'session_todos',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          setTodos((current) => [...current, payload.new as Todo]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'session_todos',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          setTodos((current) =>
            current.map((todo) =>
              todo.id === payload.new.id ? (payload.new as Todo) : todo
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'session_todos',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          setTodos((current) =>
            current.filter((todo) => todo.id !== payload.old.id)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    setLoading(true);

    const { error } = await supabase
      .from('session_todos')
      .insert([{
        session_id: sessionId,
        title: newTodo.trim(),
        created_by: user.id
      }]);

    if (!error) {
      setNewTodo('');
    }

    setLoading(false);
  };

  const toggleTodo = async (todo: Todo) => {
    const { error } = await supabase
      .from('session_todos')
      .update({
        completed: !todo.completed,
        completed_at: !todo.completed ? new Date().toISOString() : null,
        completed_by: !todo.completed ? user.id : null
      })
      .eq('id', todo.id);

    if (error) {
      console.error('Error toggling todo:', error);
    }
  };

  const deleteTodo = async (todoId: string) => {
    const { error } = await supabase
      .from('session_todos')
      .delete()
      .eq('id', todoId);

    if (error) {
      console.error('Error deleting todo:', error);
    }
  };

  const completedCount = todos.filter((t) => t.completed).length;
  const totalCount = todos.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-2">Список задач</h3>
        
        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
              <span>Прогресс</span>
              <span>{completedCount} из {totalCount}</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Add todo form */}
        <form onSubmit={addTodo} className="flex gap-2">
          <Input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="Добавить задачу..."
            className="flex-1 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
          />
          <Button
            type="submit"
            disabled={loading || !newTodo.trim()}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* Todo list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {todos.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Нет задач. Добавьте первую!</p>
          </div>
        ) : (
          todos.map((todo) => (
            <div
              key={todo.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all group",
                todo.completed
                  ? "bg-gray-900 border-gray-800"
                  : "bg-gray-800 border-gray-700 hover:border-purple-500/50"
              )}
            >
              <Checkbox
                checked={todo.completed}
                onCheckedChange={() => toggleTodo(todo)}
                className="border-gray-600"
              />

              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm transition-all",
                    todo.completed
                      ? "line-through text-gray-500"
                      : "text-white"
                  )}
                >
                  {todo.title}
                </p>
                {todo.completed && todo.completed_at && (
                  <p className="text-xs text-gray-600 mt-1">
                    Завершено {new Date(todo.completed_at).toLocaleString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteTodo(todo.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Stats */}
      {totalCount > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-800">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>✓ {completedCount} завершено</span>
            <span>{totalCount - completedCount} осталось</span>
          </div>
        </div>
      )}
    </div>
  );
}