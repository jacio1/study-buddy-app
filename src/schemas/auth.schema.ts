import z from "zod";

export const loginSchema = z.object({
  email: z.email("Введите корректный email"),
  password: z.string().min(6, "Введите пароль"),
});

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Имя пользователя должно содержать минимум 3 символа")
    .max(20, "Имя пользователя не должно превышать 20 символов"),
  email: z.email("Введите корректный email"),
  password: z
    .string()
    .min(6, "Пароль должен содержать минимум 6 символов")
    .max(20, "Пароль не должен превышать 20 символов"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
