import { useMemo, useState } from "react";
import { Download, FileText } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { DataTable } from "./DataTable";
import { FuelEntry, ServiceEntry } from "@/lib/types";
import { buildDownloadReports } from "@/lib/reportAnalytics";
import { exportDownloadReportPDF } from "@/lib/pdfExport";

interface Props {
  services: ServiceEntry[];
  fuelEntries: FuelEntry[];
}

export default function DashboardReportes({ services, fuelEntries }: Props) {
  const reports = useMemo(() => buildDownloadReports(services, fuelEntries), [services, fuelEntries]);
  const [selectedId, setSelectedId] = useState(reports[0]?.id);
  const selectedReport = reports.find((report) => report.id === selectedId) || reports[0];

  if (!selectedReport) return null;

  return (
    <div className="space-y-4">
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
        <Button className="gap-2" onClick={() => exportDownloadReportPDF(selectedReport)}>
          <Download className="w-4 h-4" /> Descargar PDF
        </Button>
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