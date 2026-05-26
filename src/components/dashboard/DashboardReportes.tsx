import { useMemo, useState } from "react";
import { Download, FileText, FileSpreadsheet, Filter, X } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "./DataTable";
import { FuelEntry, ServiceEntry, normalizeClientName } from "@/lib/types";
import { buildDownloadReports } from "@/lib/reportAnalytics";
import { exportDownloadReportPDF } from "@/lib/pdfExport";
import { exportDownloadReportExcel } from "@/lib/excelExport";

interface Props {
  services: ServiceEntry[];
  fuelEntries: FuelEntry[];
}

const TIPO_LABELS: Record<string, string> = {
  todos: "Todos",
  ninguno: "Sin tipo cruzado",
  cenop_en_op: "CENOP en Operaciones",
  op_en_cenop: "Operaciones en CENOP",
};

export default function DashboardReportes({ services, fuelEntries }: Props) {
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [cliente, setCliente] = useState("todos");
  const [personal, setPersonal] = useState("todos");
  const [movil, setMovil] = useState("todos");
  const [tipoCruzado, setTipoCruzado] = useState("todos");
  const [conPeajes, setConPeajes] = useState("todos"); // todos | si | no
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  // Opciones dinámicas
  const clientesOptions = useMemo(
    () => Array.from(new Set(services.map((s) => normalizeClientName(s.cliente)).filter(Boolean))).sort(),
    [services],
  );
  const personalOptions = useMemo(
    () => Array.from(new Set(services.flatMap((s) => [s.chofer, s.custodio]).filter(Boolean))).sort(),
    [services],
  );
  const movilOptions = useMemo(
    () => Array.from(new Set(services.map((s) => s.movil).filter(Boolean))).sort(),
    [services],
  );

  // Aplicar filtros
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      if (fechaDesde && s.fecha < fechaDesde) return false;
      if (fechaHasta && s.fecha > fechaHasta) return false;
      if (cliente !== "todos" && normalizeClientName(s.cliente) !== cliente) return false;
      if (personal !== "todos" && s.chofer !== personal && s.custodio !== personal) return false;
      if (movil !== "todos" && s.movil !== movil) return false;
      if (tipoCruzado !== "todos" && (s.tipoCenopOp || "ninguno") !== tipoCruzado) return false;
      if (conPeajes === "si" && !(s.peajes?.length)) return false;
      if (conPeajes === "no" && (s.peajes?.length || 0) > 0) return false;
      return true;
    });
  }, [services, fechaDesde, fechaHasta, cliente, personal, movil, tipoCruzado, conPeajes]);

  const filteredFuel = useMemo(() => {
    return fuelEntries.filter((f) => {
      if (fechaDesde && f.fecha < fechaDesde) return false;
      if (fechaHasta && f.fecha > fechaHasta) return false;
      if (movil !== "todos" && f.movil !== movil) return false;
      if (personal !== "todos" && f.chofer !== personal) return false;
      return true;
    });
  }, [fuelEntries, fechaDesde, fechaHasta, movil, personal]);

  const reports = useMemo(
    () => buildDownloadReports(filteredServices, filteredFuel),
    [filteredServices, filteredFuel],
  );
  const selectedReport = reports.find((r) => r.id === selectedId) || reports[0];

  const clearFilters = () => {
    setFechaDesde(""); setFechaHasta(""); setCliente("todos");
    setPersonal("todos"); setMovil("todos"); setTipoCruzado("todos"); setConPeajes("todos");
  };

  const hasFilters = fechaDesde || fechaHasta || cliente !== "todos" || personal !== "todos" || movil !== "todos" || tipoCruzado !== "todos" || conPeajes !== "todos";

  if (!selectedReport) return null;

  return (
    <div className="space-y-4">
      {/* Panel de filtros */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Filter className="w-4 h-4 text-primary" /> Filtros del Reporte
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={clearFilters}>
              <X className="w-3 h-3" /> Limpiar
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Desde</Label>
            <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Hasta</Label>
            <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Cliente</Label>
            <Select value={cliente} onValueChange={setCliente}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="todos">Todos</SelectItem>
                {clientesOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Personal</Label>
            <Select value={personal} onValueChange={setPersonal}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="todos">Todos</SelectItem>
                {personalOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Móvil</Label>
            <Select value={movil} onValueChange={setMovil}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="todos">Todos</SelectItem>
                {movilOptions.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tipo Cruzado</Label>
            <Select value={tipoCruzado} onValueChange={setTipoCruzado}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TIPO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Peajes</Label>
            <Select value={conPeajes} onValueChange={setConPeajes}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="si">Con peajes</SelectItem>
                <SelectItem value="no">Sin peajes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          {filteredServices.length} servicios · {filteredFuel.length} cargas de combustible {hasFilters && "(filtrados)"}
        </div>
      </div>

      {/* Selector de reporte */}
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
        {reports.map((report) => (
          <button
            key={report.id}
            onClick={() => setSelectedId(report.id)}
            className={`glass-card p-4 text-left border transition-colors ${selectedReport.id === report.id ? "border-primary bg-primary/10" : "border-border hover:bg-secondary/40"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <p className="text-sm font-bold text-foreground">{report.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{report.description}</p>
              </div>
              <FileText className="w-5 h-5 text-primary shrink-0" />
            </div>
            <div className="mt-4 flex items-end justify-between gap-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{report.totalLabel}</span>
              <span className="stat-value text-lg">{report.totalValue}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 glass-card p-4">
        <div>
          <h3 className="text-base font-bold text-foreground">{selectedReport.title}</h3>
          <p className="text-sm text-muted-foreground">{selectedReport.description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => exportDownloadReportExcel(selectedReport)}>
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </Button>
          <Button className="gap-2" onClick={() => exportDownloadReportPDF(selectedReport)}>
            <Download className="w-4 h-4" /> PDF
          </Button>
        </div>
      </div>

      {selectedReport.chartData.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Gráfico — {selectedReport.metricLabel}</h3>
          <ResponsiveContainer width="100%" height={Math.max(280, Math.min(620, selectedReport.chartData.length * 34))}>
            <BarChart data={selectedReport.chartData.slice(0, 20)} layout="vertical">
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(_, __, item) => item.payload.label} />
              <Bar dataKey="value" name={selectedReport.metricLabel} fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <DataTable columns={selectedReport.columns} rows={selectedReport.rows} />
    </div>
  );
}
