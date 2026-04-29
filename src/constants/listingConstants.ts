export const CATEGORIES = [
  { id: 'programming',  label: '💻 Программирование' },
  { id: 'math',         label: '📐 Математика и статистика' },
  { id: 'languages',    label: '🌍 Иностранные языки' },
  { id: 'economics',    label: '💼 Экономика и бизнес' },
  { id: 'sciences',     label: '⚗️ Естественные науки' },
  { id: 'humanities',   label: '📚 Гуманитарные науки' },
  { id: 'design',       label: '🎨 Дизайн и творчество' },
  { id: 'medicine',     label: '🏥 Медицина и биология' },
  { id: 'law',          label: '⚖️ Право и юриспруденция' },
  { id: 'other',        label: '🎓 Другое' },
];

export const LEVELS = [
  { id: 'beginner',     label: 'Начинающий',  color: 'text-emerald-400' },
  { id: 'intermediate', label: 'Средний',      color: 'text-amber-400'   },
  { id: 'advanced',     label: 'Продвинутый', color: 'text-rose-400'    },
];

export const SCHEDULE_OPTIONS = [
  'Утро (до 12:00)',
  'День (12:00–18:00)',
  'Вечер (после 18:00)',
  'Выходные',
  'Будни',
  'Гибкий график',
];

export const FORMAT_OPTIONS = [
  { id: 'online',  icon: '💻', label: 'Онлайн'  },
  { id: 'offline', icon: '🤝', label: 'Офлайн'  },
  { id: 'all',     icon: '🌐', label: 'Любой'   },
] as const;