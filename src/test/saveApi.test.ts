import { describe, it } from "vitest";
import jsPDF from "jspdf";

describe("save api", () => {
  it("works", () => {
    console.log("API", typeof (jsPDF as any).API);
    console.log("API.save", typeof (jsPDF as any).API?.save);
    const doc = new jsPDF();
    console.log("doc.save", typeof doc.save);
  });
});
