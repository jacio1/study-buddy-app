'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Timer } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Button } from '../ui/button';

type TimerMode = 'work' | 'shortBreak' | 'longBreak';

const TIMER_CONFIGS = {
  work: { duration: 25 * 60, label: 'Работа', color: 'text-purple-400' },
  shortBreak: { duration: 5 * 60, label: 'Короткий перерыв', color: 'text-green-400' },
  longBreak: { duration: 15 * 60, label: 'Длинный перерыв', color: 'text-blue-400' }
};

export function PomodoroTimer() {
  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState(TIMER_CONFIGS.work.duration);
  const [isRunning, setIsRunning] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Создаем аудио элемент для уведомлений
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjSH0fPTgjMGHm7A7+OZUA0OVqzn77BdGAg+ltrzxnMpBSd+zPLaizsIGGS57OihURALTKXh8bllHAU2jdXzzn0vBSGAzPDajz0HGWy+7OWhUhAMT6ri8LxnHgY5kdXy0YA3BxyAze/cnD0GGm/A7OSdURAMUarj8L1nHAU4jtPy04A3BxuAze7cnT0HGm/B7OOeUBANUqvk77tmHAU4jdPy04A4Bxt/ze7bnT0HGm/A7OOeUBENUavk775mHAU4jdPy0oA3Bxt/ze7cnT4HGm/A7OOeUBENUqvj8L5nHAU5jdPy0oA3Bxt/ze7cnj4HGm/A7OOeUBENUqvj8L5nHAU5jdPy0oA3Bxt/ze7cnj4HGm/A7OOeUBENUqvj8L5nHAU5jdPy0oA3Bxt/ze7cnj4HGm/A7OOeT///8A==');
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const handleTimerComplete = () => {
    setIsRunning(false);
    
    // Воспроизводим звук
    audioRef.current?.play().catch(() => {});
    
    // Уведомление браузера
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Помодоро завершен!', {
        body: mode === 'work' ? 'Время для перерыва!' : 'Готовы продолжить работу?',
        icon: '/favicon.ico'
      });
    }

    // Переключаем режим
    if (mode === 'work') {
      const newPomodoros = completedPomodoros + 1;
      setCompletedPomodoros(newPomodoros);
      
      // Каждый 4-й помодоро - длинный перерыв
      const nextMode = newPomodoros % 4 === 0 ? 'longBreak' : 'shortBreak';
      setMode(nextMode);
      setTimeLeft(TIMER_CONFIGS[nextMode].duration);
    } else {
      setMode('work');
      setTimeLeft(TIMER_CONFIGS.work.duration);
    }
  };

  const toggleTimer = () => {
    if (!isRunning && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(TIMER_CONFIGS[mode].duration);
  };

  const switchMode = (newMode: TimerMode) => {
    setMode(newMode);
    setTimeLeft(TIMER_CONFIGS[newMode].duration);
    setIsRunning(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((TIMER_CONFIGS[mode].duration - timeLeft) / TIMER_CONFIGS[mode].duration) * 100;

  return (
    <div className="flex flex-col items-center">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Timer className="h-5 w-5" />
          Помодоро таймер
        </h3>
        
        {/* Mode selector */}
        <div className="flex gap-2 bg-gray-800 p-1 rounded-lg">
          {(Object.keys(TIMER_CONFIGS) as TimerMode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                mode === m
                  ? "bg-purple-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              )}
            >
              {TIMER_CONFIGS[m].label}
            </button>
          ))}
        </div>
      </div>

      {/* Timer display */}
      <div className="relative mb-8">
        {/* Progress circle */}
        <svg className="transform -rotate-90" width="280" height="280">
          <circle
            cx="140"
            cy="140"
            r="130"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-gray-800"
          />
          <circle
            cx="140"
            cy="140"
            r="130"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 130}`}
            strokeDashoffset={`${2 * Math.PI * 130 * (1 - progress / 100)}`}
            className={cn(
              "transition-all duration-1000",
              mode === 'work' ? 'text-purple-500' :
              mode === 'shortBreak' ? 'text-green-500' : 'text-blue-500'
            )}
            strokeLinecap="round"
          />
        </svg>

        {/* Time text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={cn(
            "text-6xl font-bold tabular-nums",
            TIMER_CONFIGS[mode].color
          )}>
            {formatTime(timeLeft)}
          </div>
          <div className="text-sm text-gray-400 mt-2">
            {TIMER_CONFIGS[mode].label}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-3 mb-6">
        <Button
          onClick={toggleTimer}
          size="lg"
          className={cn(
            "w-32",
            isRunning
              ? "bg-yellow-600 hover:bg-yellow-700"
              : "bg-purple-600 hover:bg-purple-700"
          )}
        >
          {isRunning ? (
            <>
              <Pause className="h-5 w-5 mr-2" />
              Пауза
            </>
          ) : (
            <>
              <Play className="h-5 w-5 mr-2" />
              Старт
            </>
          )}
        </Button>

        <Button
          onClick={resetTimer}
          size="lg"
          variant="outline"
          className="border-gray-700 hover:bg-gray-800"
        >
          <RotateCcw className="h-5 w-5" />
        </Button>
      </div>

      {/* Stats */}
      <div className="bg-gray-800 rounded-lg p-4 w-full">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Завершено помодоро:</span>
          <span className="font-semibold text-purple-400 text-lg">
            {completedPomodoros}
          </span>
        </div>
        <div className="mt-2 flex gap-1">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "flex-1 h-2 rounded-full",
                i < completedPomodoros % 4
                  ? "bg-purple-500"
                  : "bg-gray-700"
              )}
            />
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          {completedPomodoros % 4 === 0 && completedPomodoros > 0
            ? "Время для длинного перерыва!"
            : `${4 - (completedPomodoros % 4)} до длинного перерыва`}
        </p>
      </div>
    </div>
  );
}