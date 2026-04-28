"use client";

import { ReactNode } from "react";

interface AuthCardProps {
  children: ReactNode;
}

export function AuthCard({ children }: AuthCardProps) {
  return (
    <div className="flex items-center justify-center min-h-screen p-5 bg-background">
      <div className="bg-card rounded-3xl border border-border max-w-110 w-full p-8 shadow-xl">
        <h1
          className="text-foreground text-center mb-2"
          style={{ fontSize: "2.5rem" }}
        >
          StudyMate
        </h1>
        <p className="text-muted-foreground text-center mb-8">Войдите в свой аккаунт</p>
        {children}
      </div>
    </div>
  );
}