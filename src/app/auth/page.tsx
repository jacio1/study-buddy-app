"use client";

import { supabase } from "@/src/lib/supabase";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/src/components/ui/input-group";
import { EyeClosedIcon, EyeIcon } from "lucide-react";
import { cn } from "@/src/lib/utils";

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        router.push("/");
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        setMessage("Проверьте email для подтверждения регистрации");
      }
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-5">
      <div className="bg-[#1B1B1C] rounded-3xl card fade-in max-w-110 w-full p-8">
        <h1
          className="text-white"
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
          className="text-gray-200"
          style={{
            textAlign: "center",
            marginBottom: "32px",
          }}
        >
          Найди идеального напарника для учебы
        </p>

        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "24px",
            background: "#fef6e4",
            padding: "4px",
            borderRadius: "8px",
            backgroundColor: "#151517",
          }}
        >
          <Button
            onClick={() => setIsLogin(true)}
            className={cn(
              "flex-1 p-2.5 h-12 text-lg",
              isLogin
                ? "bg-[#1b1b1c]"
                : "bg-transparent text-white hover:scale-110",
            )}
          >
            Вход
          </Button>

          <Button
            onClick={() => setIsLogin(false)}
            className={cn(
              "flex-1 p-2.5 h-12 text-lg",
              !isLogin
                ? "bg-[#1b1b1c]"
                : "text-white bg-transparent hover:scale-110",
            )}
          >
            Регистрация
          </Button>
        </div>

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          <FieldGroup>
            {!isLogin && (
              <>
                <Field>
                  <FieldLabel>Имя пользователя</FieldLabel>
                  <Input
                    type="text"
                    placeholder="Введите имя пользователя"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </Field>
              </>
            )}
            <Field>
              <FieldLabel>Email</FieldLabel>
              <Input
                className="text-xl"
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
                  minLength={6}
                  required
                />
                <InputGroupAddon
                  className="text-white cursor-pointer"
                  align={"inline-end"}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {!showPassword ? (
                    <EyeClosedIcon className="scale-150" />
                  ) : (
                    <EyeIcon className="scale-150" />
                  )}
                </InputGroupAddon>
              </InputGroup>
            </Field>
            <Field>
              <Button
                className="bg-white text-black h-12 text-lg  hover:bg-gray-200 cursor-pointer"
                type="submit"
                disabled={loading}
                variant={"outline"}
              >
                {loading
                  ? "Загрузка..."
                  : isLogin
                    ? "Войти"
                    : "Зарегистрироваться"}
              </Button>
            </Field>
          </FieldGroup>
        </form>

        {message && (
          <p
            style={{
              marginTop: "16px",
              padding: "12px",
              background: "#f3d2c1",
              borderRadius: "8px",
              fontSize: "14px",
              color: "#001858",
              textAlign: "center",
            }}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
