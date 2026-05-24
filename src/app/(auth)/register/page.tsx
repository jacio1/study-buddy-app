'use client'

import Link from "next/link";
import { AuthMessage } from "../_components/AuthMessage";
import { AgreementCheckbox } from "../_components/AgreementCheckbox";
import { PasswordInput } from "../_components/PasswordInput";
import { FormInput } from "../_components/FormInput";
import { AuthForm } from "../_components/AuthForm";
import { AuthCard } from "../_components/AuthCard";
import { useAuth } from "@/src/hooks/useAuth";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RegisterFormData, registerSchema } from "@/src/schemas/auth.schema";

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
  } = useForm<RegisterFormData & { agreedToTerms?: boolean }>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      agreedToTerms: false,
    },
  });

  const onSubmit = async (data: RegisterFormData & { agreedToTerms: boolean }) => {
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
        
        <AgreementCheckbox 
          register={register} 
          error={errors.agreedToTerms}
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