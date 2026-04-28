"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, RegisterFormData } from "@/src/schemas/auth.schema";
import { useAuth } from "../../../hooks/useAuth";
import { AuthCard } from "../_components/AuthCard";
import { AuthForm } from "../_components/AuthForm";
import { FormInput } from "../_components/FormInput";
import { PasswordInput } from "../_components/PasswordInput";
import { AuthMessage } from "../_components/AuthMessage";

export default function RegisterPage() {
  const {
    register: registerUser,
    loading,
    serverError,
    clearServerError,
  } = useAuth();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    clearServerError();
    setSuccessMessage(null);

    const result = await registerUser(data.email, data.password, data.username);

    if (result.success && result.message) {
      setSuccessMessage(result.message);
    }
  };

  return (
    <AuthCard>
      <AuthForm
        onSubmit={handleSubmit(onSubmit)}
        loading={loading}
        submitText="Зарегистрироваться"
      >
        <FormInput
          label="Имя пользователя"
          name="username"
          register={register}
          error={errors.username}
          placeholder="Введите имя пользователя"
          required
        />
        <FormInput
          label="Email"
          name="email"
          autoComplete="email"
          register={register}
          error={errors.email}
          type="email"
          placeholder="Введите email"
          required
        />
        <PasswordInput
          name="password"
          autoComplete="current-password"
          register={register}
          error={errors.password}
          placeholder="Введите пароль"
          required
          showHint
        />
      </AuthForm>

      <div className="mt-6 text-center">
        <p className="text-muted-foreground">
          Уже есть аккаунт?{" "}
          <Link
            href="/login"
            className="text-primary hover:underline font-medium"
          >
            Войти
          </Link>
        </p>
      </div>

      {successMessage && (
        <AuthMessage message={successMessage} type="success" />
      )}
      {serverError && !successMessage && (
        <AuthMessage message={serverError} type="error" />
      )}
    </AuthCard>
  );
}
