'use client'

import { supabase } from "@/src/lib/supabase";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        router.push('/')
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName }
          }
        });
        if (error) throw error;
        setMessage('Проверьте email для подтверждения регистрации');
      }
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-5">
      <div className="bg-[#131313] card fade-in" style={{ maxWidth: '440px', width: '100%' }}>
        <h1 className="text-white" style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '2.5rem',
          marginBottom: '8px',
          textAlign: 'center'
        }}>
          StudyMate
        </h1>
        <p className="text-gray-200" style={{
          textAlign: 'center',
          marginBottom: '32px'
        }}>
          Найди идеального напарника для учебы
        </p>

        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          background: '#fef6e4',
          padding: '4px',
          borderRadius: '8px'
        }}>
          <button
            onClick={() => setIsLogin(true)}
            style={{
              flex: 1,
              padding: '10px',
              background: isLogin ? 'white' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              color: '#001858',
              cursor: 'pointer'
            }}
          >
            Вход
          </button>
          <button
            onClick={() => setIsLogin(false)}
            style={{
              flex: 1,
              padding: '10px',
              background: !isLogin ? 'white' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              color: '#001858',
              cursor: 'pointer'
            }}
          >
            Регистрация
          </button>
        </div>

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!isLogin && (
            <input
              type="text"
              placeholder="Полное имя"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Загрузка...' : isLogin ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>

        {message && (
          <p style={{
            marginTop: '16px',
            padding: '12px',
            background: '#f3d2c1',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#001858',
            textAlign: 'center'
          }}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}