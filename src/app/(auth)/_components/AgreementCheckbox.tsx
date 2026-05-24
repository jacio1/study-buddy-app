"use client";

import Link from "next/link";
import { UseFormRegister } from "react-hook-form";
import { FieldError } from "react-hook-form";



interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  agreedToTerms?: boolean;
}

interface AgreementCheckboxProps {
  register: UseFormRegister<RegisterFormData>;
  error?: FieldError;
}


export const AgreementCheckbox = ({ 
  register, 
  error 
}: AgreementCheckboxProps) => {
  return (
    <div className="mb-4">
      <label className="flex items-start gap-2 cursor-pointer group">
        <input
          type="checkbox"
          {...register("agreedToTerms")}
          className="mt-0.5 w-4 h-4 text-primary border-border rounded focus:ring-2 focus:ring-ring focus:ring-offset-0 cursor-pointer transition-colors"
          aria-invalid={!!error}
        />
        <span className="text-sm text-foreground leading-tight">
          Мною прочитаны и приняты{" "}
          <Link
            href="/documents/userAgreement"
            target="_blank"
            className="text-primary hover:underline font-medium transition-colors"
          >
            Пользовательское соглашение
          </Link>
          {" и "}
          <Link
            href="/documents/privacy"
            target="_blank"
            className="text-primary hover:underline font-medium transition-colors"
          >
            Политика конфиденциальности
          </Link>
        </span>
      </label>
      {error && (
        <p className="text-sm text-destructive mt-1 ml-6">
          {error.message}
        </p>
      )}
    </div>
  );
};