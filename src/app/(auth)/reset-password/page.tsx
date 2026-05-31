"use client";

import Link from "next/link";
import { AuthCard } from "../_components/AuthCard";
import { Input } from "@/src/components/ui/input";




export default function ResetPasswordPage() {







  return (
    <AuthCard>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">Сброс пароля</h1>
        <p className="text-muted-foreground mt-2">
          Введите ваш email и мы отправим ссылку для сброса пароля
        </p>
      </div>

    <Input placeholder="example@mail.ru"/>

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="text-sm text-primary hover:underline"
        >
          ← Вернуться ко входу
        </Link>
      </div>

    </AuthCard>
  );
}