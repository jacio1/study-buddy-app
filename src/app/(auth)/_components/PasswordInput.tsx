"use client";

import { useState } from "react";
import { Field, FieldLabel } from "@/src/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/src/components/ui/input-group";
import { EyeClosedIcon, EyeIcon } from "lucide-react";
import { UseFormRegister, FieldValues, Path, FieldError } from "react-hook-form";

interface PasswordInputProps<T extends FieldValues> {
  name: Path<T>;
  register: UseFormRegister<T>;
  error?: FieldError;
  placeholder?: string;
  required?: boolean;
  showHint?: boolean;
  autoComplete?: string;
}

export function PasswordInput<T extends FieldValues>({
  name,
  register,
  error,
  placeholder = "Введите пароль",
  showHint = false,
  autoComplete
}: PasswordInputProps<T>) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Field>
      <FieldLabel>
        Пароль
      </FieldLabel>
      <InputGroup>
        <InputGroupInput
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          autoComplete={autoComplete}
          {...register(name)}
          className={error ? "border-destructive" : ""}
        />
        <InputGroupAddon
          className="cursor-pointer text-muted-foreground hover:text-foreground"
          align="inline-end"
          onClick={() => setShowPassword(!showPassword)}
        >
          {!showPassword ? (
            <EyeClosedIcon className="h-5 w-5" />
          ) : (
            <EyeIcon className="h-5 w-5" />
          )}
        </InputGroupAddon>
      </InputGroup>
      {error && <p className="text-xs text-destructive mt-1">{error.message}</p>}
      {showHint && !error && (
        <p className="text-xs text-muted-foreground mt-1">Минимум 6 символов</p>
      )}
    </Field>
  );
}