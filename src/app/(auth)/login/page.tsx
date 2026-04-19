"use client";

import { supabase } from "@/src/lib/supabase";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/src/components/ui/input-group";
import { EyeClosedIcon, EyeIcon } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      router.push("/");
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-5 bg-background">
      <div className="bg-card rounded-3xl border border-border max-w-110 w-full p-8 shadow-xl">
        <h1
          className="text-foreground"
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "2.5rem",
            marginBottom: "8px",
            textAlign: "center",
          }}
        >
          StudyMate
        </h1>
        <p
          className="text-muted-foreground"
          style={{
            textAlign: "center",
            marginBottom: "32px",
          }}
        >
          Войдите в свой аккаунт
        </p>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <FieldGroup>
            <Field>
              <FieldLabel>Email</FieldLabel>
              <Input
                type="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Введите email"
                value={email}
                required
              />
            </Field>
            
            <Field>
              <FieldLabel>Пароль</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  type={showPassword ? "text" : "password"}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Введите пароль"
                  value={password}
                  required
                />
                <InputGroupAddon
                  className="cursor-pointer text-muted-foreground hover:text-foreground"
                  align={"inline-end"}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {!showPassword ? (
                    <EyeClosedIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </InputGroupAddon>
              </InputGroup>
            </Field>
            
            <Field>
              <Button
                className="w-full h-12 text-lg font-medium"
                type="submit"
                disabled={loading}
              >
                {loading ? "Загрузка..." : "Войти"}
              </Button>
            </Field>
          </FieldGroup>
        </form>

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

        {message && (
          <div
            className="mt-4 p-3 rounded-lg text-sm text-center"
            style={{ 
              backgroundColor: "hsl(var(--destructive) / 0.15)", 
              color: "hsl(var(--destructive-foreground))",
              border: "1px solid hsl(var(--destructive) / 0.3)"
            }}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}