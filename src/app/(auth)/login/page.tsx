"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginFormData } from "@/src/schemas/auth.schema";
import { useAuth } from "../../../hooks/useAuth";
import { AuthCard } from "../_components/AuthCard";
import { AuthForm } from "../_components/AuthForm";
import { FormInput } from "../_components/FormInput";
import { PasswordInput } from "../_components/PasswordInput";
import { AuthMessage } from "../_components/AuthMessage";

export default function LoginPage() {
  const { login, loading, serverError, clearServerError } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    clearServerError();
    await login(data.email, data.password);
  };

  return (
    <AuthCard>
      <AuthForm
        onSubmit={handleSubmit(onSubmit)}
        loading={loading}
        submitText="Войти"
      >
        <FormInput
          label="Email"
          name="email"
          register={register}
          error={errors.email}
          autoComplete="email"
          type="email"
          placeholder="Введите email"
        />
        <PasswordInput
          name="password"
          register={register}
          autoComplete="current-password"
          error={errors.password}
          placeholder="Введите пароль"
          required
        />
      </AuthForm>

      <div className="mt-6 text-center">
        <p className="text-muted-foreground">
          Нет аккаунта?{" "}
          <Link
            href="/register"
            className="text-primary hover:underline font-medium"
          >
            Зарегистрироваться
          </Link>
        </p>
      </div>

      <AuthMessage message={serverError} />
    </AuthCard>
  );
}
