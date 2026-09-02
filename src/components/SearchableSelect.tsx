import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
  /** Render the dropdown in a portal (needed inside scrollable/overflow containers) */
  portal?: boolean;
  /** Se dispara al confirmar una opción (clic o Enter) — útil para saltar al siguiente casillero */
  onSelect?: () => void;
}

export default function SearchableSelect({ options, value, onChange, placeholder, className, inputClassName, dropdownClassName, badgeMap, portal, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectOption = (option: string) => {
    onChange(option);
    setSearch("");
    setOpen(false);
    inputRef.current?.blur();
    onSelect?.();
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 180) });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  const norm = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  const query = open ? norm(search) : "";
  const sorted = [...options].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  const filtered = query
    ? sorted
        .filter((o) => {
          const n = norm(o);
          return query.split(/\s+/).every((t) => n.includes(t));
        })
        .sort((a, b) => {
          const sa = norm(a).startsWith(query) ? 0 : 1;
          const sb = norm(b).startsWith(query) ? 0 : 1;
          return sa - sb || a.localeCompare(b, "es", { sensitivity: "base" });
        })
    : sorted;

  const list = (
    <div
      data-searchable-select-dropdown="true"
      className={cn(
        "max-h-48 overflow-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md",
        "fixed z-[200] pointer-events-auto",
        dropdownClassName
      )}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      style={rect ? { top: rect.top, left: rect.left, width: rect.width } : { visibility: "hidden" }}
    >
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
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              selectOption(opt);
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (value !== opt) selectOption(opt);
            }}
          >
            <span className="truncate">{opt}</span>
            {badgeMap?.[opt] && (
              <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                {badgeMap[opt]}
              </span>
            )}
          </div>
        ))
      )}
    </div>
  );

  return (
    <div ref={ref} className={cn("relative", className)}>

      <div className="relative">
        <Input
          ref={inputRef}
          value={open ? search : value}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setSearch("");
          }}
          onBlur={() => {
            setSearch("");
            setOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const pick = open && search ? filtered[0] : undefined;
              if (pick) onChange(pick);
              setOpen(false);
              onSelect?.();
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder={placeholder}
          className={cn("h-9 bg-background text-foreground text-sm pr-14", inputClassName)}
        />
        {value && !open && (
          <button
            type="button"
            aria-label="Borrar selección"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange("");
              setSearch("");
              setOpen(false);
            }}
            className="absolute right-7 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>
      {open && createPortal(list, document.body)}

    </div>
  );
}
