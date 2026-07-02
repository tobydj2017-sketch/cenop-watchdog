import { describe, it } from "vitest";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

describe("table width", () => {
  it("small widths", () => {
    const doc = new jsPDF({ orientation: "landscape", format: "a4", unit: "mm" });
    autoTable(doc, {
      head: [["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]],
      body: [["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]],
      margin: { left: 8, right: 8 },
      columnStyles: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i, { cellWidth: 10 }])),
      tableWidth: "auto",
    });
    console.log("small widths ok");
  });
});
