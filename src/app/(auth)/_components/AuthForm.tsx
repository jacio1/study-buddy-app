"use client";

import { ReactNode } from "react";
import { Field, FieldGroup } from "@/src/components/ui/field";
import { Button } from "@/src/components/ui/button";

interface AuthFormProps {
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  children: ReactNode;
  submitText: string;
}

export function AuthForm({ onSubmit, loading, children, submitText }: AuthFormProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <FieldGroup>
        {children}
        <Field>
          <Button
            className="w-full h-12 text-lg font-medium"
            type="submit"
            disabled={loading}
          >
            {loading ? "Загрузка..." : submitText}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}