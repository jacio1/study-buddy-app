"use client";

import { Field, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import {
  FieldError,
  FieldValues,
  Path,
  UseFormRegister,
} from "react-hook-form";

interface FormInputProps<T extends FieldValues> {
  label: string;
  name: Path<T>;
  register: UseFormRegister<T>;
  error?: FieldError;
  type?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
}

export function FormInput<T extends FieldValues>({
  label,
  name,
  register,
  autoComplete,
  error,
  type = "text",
  placeholder = "",
}: FormInputProps<T>) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Input
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        {...register(name)}
        className={error ? "border-destructive" : ""}
      />
      {error && (
        <p className="text-xs text-destructive mt-1">{error.message}</p>
      )}
    </Field>
  );
}
