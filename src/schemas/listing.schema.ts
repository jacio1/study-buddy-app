import { z } from 'zod';
import { CATEGORIES } from '@/src/constants/listingConstants';

export const listingSchema = z.object({
  title: z.string().min(5, 'Минимум 5 символов').max(100),
  subject: z.string().min(2, 'Укажите предмет'),
  category: z.enum(CATEGORIES.map(c => c.id) as [string, ...string[]]),
  description: z.string().min(20, 'Описание должно быть детальнее'),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  schedule: z.string().min(3, 'Укажите вашу доступность'),
  format: z.enum(['online', 'offline', 'any']),
  city: z.string().optional(),
});

export type ListingFormData = z.infer<typeof listingSchema>;