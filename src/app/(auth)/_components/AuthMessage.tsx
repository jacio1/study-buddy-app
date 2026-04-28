interface AuthMessageProps {
  message: string | null;
  type?: "success" | "error";
}

export function AuthMessage({ message , type = "error" }: AuthMessageProps) {
  if (!message) return null;

  const isSuccess = type === "success";
  
  return (
    <div
      className="mt-4 p-3 rounded-lg text-sm text-center"
      style={{
        backgroundColor: isSuccess
          ? "hsl(var(--secondary) / 0.15)"
          : "hsl(var(--destructive) / 0.15)",
        color: isSuccess
          ? "hsl(var(--secondary-foreground))"
          : "hsl(var(--destructive-foreground))",
        border: isSuccess
          ? "1px solid hsl(var(--secondary) / 0.3)"
          : "1px solid hsl(var(--destructive) / 0.3)",
      }}
    >
      Ошибка при авторизации: {message}
    </div>
  );
}