import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

export function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border pb-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full text-left mb-3"
      >
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          {title}
        </span>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}