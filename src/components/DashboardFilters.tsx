import { useState, useMemo, useEffect, useCallback } from "react";
import { Filter, X, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ServiceEntry, FuelEntry } from "@/lib/types";
import { getPersonal } from "@/lib/personalStore";

interface Props {
  services: ServiceEntry[];
  fuelEntries: FuelEntry[];
  onFilter: (services: ServiceEntry[], fuelEntries: FuelEntry[]) => void;
}

export default function DashboardFilters({ services, fuelEntries, onFilter }: Props) {
  const [selectedPersonal, setSelectedPersonal] = useState<string[]>([]);
  const [selectedMoviles, setSelectedMoviles] = useState<string[]>([]);
  const [selectedClientes, setSelectedClientes] = useState<string[]>([]);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [searchPersonal, setSearchPersonal] = useState("");
  const [searchMovil, setSearchMovil] = useState("");
  const [searchCliente, setSearchCliente] = useState("");
  const [tipoPersonal, setTipoPersonal] = useState<"todos" | "cenop" | "operaciones">("todos");

  const opsNames = useMemo(() => {
    const personal = getPersonal();
    return new Set(personal.filter((p) => p.roles.includes("operaciones")).map((p) => p.nombre));
  }, []);

  const allPersonal = useMemo(() => {
    const set = new Set<string>();
    services.forEach((s) => {
      if (s.chofer) set.add(s.chofer);
      if (s.custodio) set.add(s.custodio);
    });
    let names = Array.from(set).sort();
    if (tipoPersonal === "operaciones") {
      names = names.filter((n) => opsNames.has(n));
    } else if (tipoPersonal === "cenop") {
      names = names.filter((n) => !opsNames.has(n));
    }
    return names;
  }, [services, tipoPersonal, opsNames]);

  const allMoviles = useMemo(() => {
    const set = new Set<string>();
    services.forEach((s) => { if (s.movil) set.add(s.movil); });
    return Array.from(set).sort();
  }, [services]);

  const allClientes = useMemo(() => {
    const set = new Set<string>();
    services.forEach((s) => { if (s.cliente) set.add(s.cliente); });
    return Array.from(set).sort();
  }, [services]);

  const hasFilters = selectedPersonal.length > 0 || selectedMoviles.length > 0 || selectedClientes.length > 0 || fechaDesde || fechaHasta || tipoPersonal !== "todos";

  const totalSelected = selectedPersonal.length + selectedMoviles.length + selectedClientes.length + (fechaDesde ? 1 : 0) + (fechaHasta ? 1 : 0) + (tipoPersonal !== "todos" ? 1 : 0);

  const applyFilters = () => {
    let filtered = [...services];
    if (fechaDesde) filtered = filtered.filter((s) => s.fecha >= fechaDesde);
    if (fechaHasta) filtered = filtered.filter((s) => s.fecha <= fechaHasta);
    if (selectedPersonal.length > 0) {
      filtered = filtered.filter((s) => selectedPersonal.includes(s.chofer) || selectedPersonal.includes(s.custodio));
    }
    if (selectedMoviles.length > 0) {
      filtered = filtered.filter((s) => selectedMoviles.includes(s.movil));
    }
    if (selectedClientes.length > 0) {
      filtered = filtered.filter((s) => selectedClientes.includes(s.cliente));
    }
    if (tipoPersonal === "operaciones") {
      filtered = filtered.filter((s) => opsNames.has(s.chofer) || opsNames.has(s.custodio));
    } else if (tipoPersonal === "cenop") {
      filtered = filtered.filter((s) => !opsNames.has(s.chofer) && !opsNames.has(s.custodio));
    }

    let filteredFuel = [...fuelEntries];
    if (fechaDesde) filteredFuel = filteredFuel.filter((f) => f.fecha >= fechaDesde);
    if (fechaHasta) filteredFuel = filteredFuel.filter((f) => f.fecha <= fechaHasta);
    if (selectedMoviles.length > 0) {
      filteredFuel = filteredFuel.filter((f) => selectedMoviles.includes(f.movil));
    }
    if (selectedPersonal.length > 0) {
      filteredFuel = filteredFuel.filter((f) => selectedPersonal.includes(f.chofer));
    }

    onFilter(filtered, filteredFuel);
  };

  const clearFilters = () => {
    setSelectedPersonal([]);
    setSelectedMoviles([]);
    setSelectedClientes([]);
    setFechaDesde("");
    setFechaHasta("");
    setSearchPersonal("");
    setSearchMovil("");
    setSearchCliente("");
    setTipoPersonal("todos");
    onFilter(services, fuelEntries);
  };

  const toggleItem = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    setList((prev) => prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]);
  };

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Filtros</span>
          {hasFilters && (
            <Badge variant="secondary" className="text-xs">{totalSelected} activos</Badge>
          )}
        </div>
        <div className="flex gap-2">
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-xs">
              <X className="w-3 h-3" /> Limpiar
            </Button>
          )}
          <Button size="sm" onClick={applyFilters} className="gap-1 text-xs">
            Aplicar Filtros
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Tipo Personal */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Tipo Personal</label>
          <div className="flex h-8 rounded-md border border-input overflow-hidden">
            {([
              { key: "todos", label: "Todos" },
              { key: "cenop", label: "CENOP" },
              { key: "operaciones", label: "OP" },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTipoPersonal(key)}
                className={`flex-1 text-xs font-medium transition-colors ${
                  tipoPersonal === key
                    ? "bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {/* Fecha Desde */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <CalendarDays className="w-3 h-3" /> Desde
          </label>
          <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="h-8 text-xs font-mono" />
        </div>

        {/* Fecha Hasta */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <CalendarDays className="w-3 h-3" /> Hasta
          </label>
          <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="h-8 text-xs font-mono" />
        </div>

        {/* Personal */}
        <MultiSelectPopover
          label="Personal"
          items={allPersonal}
          selected={selectedPersonal}
          search={searchPersonal}
          onSearchChange={setSearchPersonal}
          onToggle={(item) => toggleItem(selectedPersonal, setSelectedPersonal, item)}
        />

        {/* Móvil/Patente */}
        <MultiSelectPopover
          label="Móvil / Patente"
          items={allMoviles}
          selected={selectedMoviles}
          search={searchMovil}
          onSearchChange={setSearchMovil}
          onToggle={(item) => toggleItem(selectedMoviles, setSelectedMoviles, item)}
        />

        {/* Cliente */}
        <MultiSelectPopover
          label="Cliente"
          items={allClientes}
          selected={selectedClientes}
          search={searchCliente}
          onSearchChange={setSearchCliente}
          onToggle={(item) => toggleItem(selectedClientes, setSelectedClientes, item)}
        />
      </div>

      {/* Selected tags */}
      {hasFilters && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {fechaDesde && (
            <Badge variant="outline" className="text-xs gap-1">
              Desde: {fechaDesde}
              <X className="w-3 h-3 cursor-pointer" onClick={() => setFechaDesde("")} />
            </Badge>
          )}
          {fechaHasta && (
            <Badge variant="outline" className="text-xs gap-1">
              Hasta: {fechaHasta}
              <X className="w-3 h-3 cursor-pointer" onClick={() => setFechaHasta("")} />
            </Badge>
          )}
          {selectedPersonal.map((p) => (
            <Badge key={p} variant="outline" className="text-xs gap-1 bg-blue-500/10 border-blue-500/30">
              {p}
              <X className="w-3 h-3 cursor-pointer" onClick={() => toggleItem(selectedPersonal, setSelectedPersonal, p)} />
            </Badge>
          ))}
          {selectedMoviles.map((m) => (
            <Badge key={m} variant="outline" className="text-xs gap-1 bg-green-500/10 border-green-500/30">
              {m}
              <X className="w-3 h-3 cursor-pointer" onClick={() => toggleItem(selectedMoviles, setSelectedMoviles, m)} />
            </Badge>
          ))}
          {selectedClientes.map((c) => (
            <Badge key={c} variant="outline" className="text-xs gap-1 bg-amber-500/10 border-amber-500/30">
              {c}
              <X className="w-3 h-3 cursor-pointer" onClick={() => toggleItem(selectedClientes, setSelectedClientes, c)} />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function MultiSelectPopover({
  label,
  items,
  selected,
  search,
  onSearchChange,
  onToggle,
}: {
  label: string;
  items: string[];
  selected: string[];
  search: string;
  onSearchChange: (v: string) => void;
  onToggle: (item: string) => void;
}) {
  const filtered = items.filter((i) => i.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground font-medium">{label}</label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-full h-8 justify-between text-xs font-normal">
            {selected.length > 0 ? `${selected.length} seleccionados` : `Todos`}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <div className="p-2 border-b border-border">
            <Input
              placeholder={`Buscar ${label.toLowerCase()}...`}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-7 text-xs"
            />
          </div>
          <div className="max-h-52 overflow-y-auto p-1">
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground p-2 text-center">Sin resultados</p>
            )}
            {filtered.map((item) => (
              <label
                key={item}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary/50 cursor-pointer text-xs"
              >
                <Checkbox
                  checked={selected.includes(item)}
                  onCheckedChange={() => onToggle(item)}
                  className="h-3.5 w-3.5"
                />
                <span className="truncate">{item}</span>
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
