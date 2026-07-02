import { describe, it } from "vitest";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

describe("table width", () => {
  it("test", () => {
    const doc = new jsPDF({ orientation: "landscape", format: "a4", unit: "mm" });
    console.log("doc width", doc.internal.pageSize.getWidth());
    autoTable(doc, {
      startY: 56,
      head: [
        [
          { content: "N°", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
          { content: "Cliente", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
          { content: "Salida → Destino", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
          { content: "Chofer", colSpan: 2, styles: { halign: "center", valign: "middle" } },
          { content: "Custodio", colSpan: 2, styles: { halign: "center", valign: "middle" } },
          { content: "Móvil", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
          { content: "Celular", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
          { content: "Observaciones", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
        ],
        [
          { content: "Nombre", styles: { halign: "center", valign: "middle" } },
          { content: "Cita", styles: { halign: "center", valign: "middle" } },
          { content: "Nombre", styles: { halign: "center", valign: "middle" } },
          { content: "Cita", styles: { halign: "center", valign: "middle" } },
        ],
      ],
      body: [
        ["1", "SATRO", "VILLA CELINA → SAN JUSTO", "GUTIERREZ", "07:00", "DIAZ JULIO", "06:14", "JTC 467", "116390-9207", ""],
      ],
      margin: { left: 8, right: 8 },
      headStyles: {
        fillColor: [60, 180, 70],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7.5,
        cellPadding: 2,
        halign: "center",
        valign: "middle",
      },
      bodyStyles: { fontSize: 8, cellPadding: 2, valign: "middle" },
      alternateRowStyles: { fillColor: [248, 250, 248] },
      styles: { lineColor: [200, 200, 200], lineWidth: 0.2, overflow: "linebreak" },
      columnStyles: {
        0: { cellWidth: 10, halign: "center", fontStyle: "bold" },
        1: { cellWidth: 23 },
        2: { cellWidth: 55 },
        3: { cellWidth: 25 },
        4: { cellWidth: 18, halign: "center", fontStyle: "bold" },
        5: { cellWidth: 25 },
        6: { cellWidth: 18, halign: "center", fontStyle: "bold" },
        7: { cellWidth: 20, halign: "center" },
        8: { cellWidth: 25, halign: "center" },
        9: { cellWidth: 40 },
      },
      tableWidth: "auto",
    });
    console.log("finalY", (doc as any).lastAutoTable.finalY);
  });
});
