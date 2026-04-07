export function DataTable({ columns, rows }: { columns: string[]; rows: (string | number)[][] }) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border">
              {columns.map((c) => (
                <th key={c} className="px-3 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider font-semibold whitespace-nowrap">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                {row.map((cell, j) => (
                  <td key={j} className={`px-3 py-2.5 ${j === 0 ? "font-semibold" : "font-mono text-xs"} ${
                    columns[j]?.includes("Prod.") && !columns[j]?.includes("Improd.") ? "text-success font-semibold" :
                    columns[j]?.includes("Improd.") ? "text-destructive font-semibold" : ""
                  }`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
