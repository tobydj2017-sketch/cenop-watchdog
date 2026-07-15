import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ChevronDown, X } from "lucide-react";

interface Props {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  dropdownClassName?: string;
  badgeMap?: Record<string, string>;
}

export default function SearchableSelect({ options, value, onChange, placeholder, className, inputClassName, dropdownClassName, badgeMap }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes((open ? search : "").toLowerCase())
  );

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div className="relative">
        <Input
          value={open ? search : value}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setSearch("");
          }}
          placeholder={placeholder}
          className={cn("h-9 text-sm pr-8", inputClassName)}
        />
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>
      {open && (
        <div className={cn("absolute z-50 mt-1 w-full max-h-48 overflow-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md", dropdownClassName)}>
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">Sin resultados</div>
          ) : (
            filtered.map((opt) => (
              <div
                key={opt}
                className={cn(
                  "px-3 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center justify-between",
                  opt === value && "bg-accent/50"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(opt);
                  setOpen(false);
                }}
              >
                <span>{opt}</span>
                {badgeMap?.[opt] && (
                  <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    {badgeMap[opt]}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
