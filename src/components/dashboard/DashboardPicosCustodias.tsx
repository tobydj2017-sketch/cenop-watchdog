import { useMemo, useState } from "react";
import { BarChart3, Download, Moon, Sun } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { ServiceEntry } from "@/lib/types";
import {
  buildCustodyPeakDays,
  custodyCountForFilter,
  CustodyPeakDay,
  CustodyShiftFilter,
  rankCustodyPeakDays,
} from "@/lib/custodyPeaks";
import { exportCustodyPeaksPDF } from "@/lib/pdfExport";
import CustodyDayDetail from "@/components/dashboard/CustodyDayDetail";

interface Props {
  services: ServiceEntry[];
}

const FILTERS: { id: CustodyShiftFilter; label: string; icon: typeof BarChart3 }[] = [
  { id: "todos", label: "Todos", icon: BarChart3 },
  { id: "dia", label: "Día", icon: Sun },
  { id: "noche", label: "Noche", icon: Moon },
];

export default function DashboardPicosCustodias({ services }: Props) {
  const [shift, setShift] = useState<CustodyShiftFilter>("todos");
  const [selectedDay, setSelectedDay] = useState<CustodyPeakDay | null>(null);
  const days = useMemo(() => buildCustodyPeakDays(services), [services]);
  const ranked = useMemo(() => rankCustodyPeakDays(days, shift), [days, shift]);
  const chartData = ranked.slice(0, 15).map((day) => ({
    ...day,
    fechaCorta: day.fechaLabel.slice(0, 5),
    seleccionadas: custodyCountForFilter(day, shift),
  }));
  const total = ranked.reduce((sum, day) => sum + custodyCountForFilter(day, shift), 0);
  const peak = ranked[0];
  const average = ranked.length ? total / ranked.length : 0;

  const openDayFromChart = (data: unknown) => {
    const candidate = data as { payload?: CustodyPeakDay; fecha?: string };
    const day = candidate.payload || candidate;
    if (day.fecha) setSelectedDay(ranked.find((item) => item.fecha === day.fecha) || null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider">Días con mayor cantidad de custodias</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Turno día: 06:00 a 17:59. Turno noche: 18:00 a 05:59. Se toma el inicio o la salida del servicio.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border border-border bg-background p-1" aria-label="Turno de custodia">
            {FILTERS.map((filter) => (
              <Button
                key={filter.id}
                type="button"
                size="sm"
                variant={shift === filter.id ? "default" : "ghost"}
                className="h-8 gap-1.5 px-3 text-xs"
                onClick={() => setShift(filter.id)}
              >
                <filter.icon className="h-3.5 w-3.5" />
                {filter.label}
              </Button>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            disabled={!ranked.length}
            onClick={() => exportCustodyPeaksPDF(ranked, shift)}
          >
            <Download className="h-3.5 w-3.5" /> Descargar reporte PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <PeakStat label="Día de mayor actividad" value={peak?.fechaLabel || "—"} />
        <PeakStat label="Máximo de custodias" value={peak ? custodyCountForFilter(peak, shift).toString() : "0"} />
        <PeakStat label="Promedio por día" value={average.toLocaleString("es-AR", { maximumFractionDigits: 1 })} />
        <PeakStat label="Días analizados" value={ranked.length.toString()} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="glass-card p-5">
          <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Top 15 días por cantidad de custodias
          </h4>
          {chartData.length ? (
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={chartData} margin={{ top: 10, right: 15, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="fechaCorta" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fechaLabel || ""}
                  formatter={(value: number, name: string) => [value, name]}
                />
                <Legend />
                {shift === "todos" ? (
                  <>
                    <Bar dataKey="dia" name="Día" fill="hsl(38, 92%, 50%)" stackId="custodias" cursor="pointer" onClick={openDayFromChart} />
                    <Bar dataKey="noche" name="Noche" fill="hsl(210, 75%, 55%)" stackId="custodias" cursor="pointer" onClick={openDayFromChart} />
                    <Bar dataKey="sinHorario" name="Sin horario" fill="hsl(var(--muted-foreground))" stackId="custodias" cursor="pointer" onClick={openDayFromChart} />
                  </>
                ) : (
                  <Bar
                    dataKey="seleccionadas"
                    name={shift === "dia" ? "Custodias de día" : "Custodias de noche"}
                    fill={shift === "dia" ? "hsl(38, 92%, 50%)" : "hsl(210, 75%, 55%)"}
                    cursor="pointer"
                    onClick={openDayFromChart}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[420px] items-center justify-center text-sm text-muted-foreground">
              No hay custodias para el turno y período seleccionados.
            </div>
          )}
        </div>

        <div className="glass-card overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ranking completo</h4>
          </div>
          <div className="max-h-[470px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card text-[11px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Fecha</th>
                  <th className="px-3 py-2 text-right">Día</th>
                  <th className="px-3 py-2 text-right">Noche</th>
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((day, index) => (
                  <tr
                    key={day.fecha}
                    className="cursor-pointer border-t border-border/60 transition-colors hover:bg-accent/40"
                    onClick={() => setSelectedDay(day)}
                    title="Ver custodias del día"
                  >
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{index + 1}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{day.fechaLabel}</div>
                      <div className="text-[11px] capitalize text-muted-foreground">{day.diaSemana}</div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{day.dia}</td>
                    <td className="px-3 py-2 text-right font-mono">{day.noche}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-primary">{day.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedDay && (
        <CustodyDayDetail
          day={selectedDay}
          shift={shift}
          services={services}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  );
}

function PeakStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card min-h-[88px] p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="stat-value mt-2 text-xl">{value}</div>
    </div>
  );
}
