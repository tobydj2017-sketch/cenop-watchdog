import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  tabIndex?: number;
  onComplete?: () => void;
}

export default function TimeInput({ value, onChange, className, tabIndex, onComplete }: Props) {
  const [raw, setRaw] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focused) {
      setRaw("");
    }
  }, [focused, value]);

  const display = focused
    ? formatPartial(raw)
    : value
    ? value
    : "";

  function formatPartial(digits: string): string {
    if (digits.length === 0) return "";
    if (digits.length <= 2) return digits;
    return digits.slice(0, 2) + ":" + digits.slice(2);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      setRaw((prev) => prev.slice(0, -1));
      if (raw.length <= 1) onChange("");
      return;
    }

    if (e.key === "Tab" || e.key === "Enter") {
      return; // let default behavior handle focus
    }

    if (e.key === "Escape") {
      inputRef.current?.blur();
      return;
    }

    // Only allow digits
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
      return;
    }

    e.preventDefault();
    const next = raw + e.key;

    if (next.length > 4) return;

    // Validate hours and minutes as they're typed
    if (next.length === 1 && parseInt(next) > 2) return;
    if (next.length === 2 && parseInt(next) > 23) return;
    if (next.length === 3 && parseInt(next[2]) > 5) return;
    if (next.length === 4 && parseInt(next.slice(2)) > 59) return;

    setRaw(next);

    if (next.length === 4) {
      const formatted = next.slice(0, 2) + ":" + next.slice(2);
      onChange(formatted);
      setTimeout(() => {
        onComplete?.();
      }, 50);
    }
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      tabIndex={tabIndex}
      value={display}
      placeholder="--:--"
      readOnly
      onKeyDown={handleKeyDown}
      onFocus={() => {
        setFocused(true);
        setRaw("");
      }}
      onBlur={() => {
        setFocused(false);
        // If partial entry, clear
        if (raw.length > 0 && raw.length < 4) {
          setRaw("");
        }
      }}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-center font-mono tracking-widest shadow-sm transition-colors",
        "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background",
        "cursor-text caret-transparent",
        focused && "ring-2 ring-ring",
        className
      )}
    />
  );
}
