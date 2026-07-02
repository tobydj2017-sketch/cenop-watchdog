import { describe, it } from "vitest";
import jsPDF from "jspdf";

describe("save override", () => {
  it("works", () => {
    console.log("before override", typeof jsPDF.prototype.save);
    (jsPDF.prototype.save as any) = function (filename: string) {
      console.log("overridden save called", filename);
    };
    const doc = new jsPDF();
    console.log("doc.save type", typeof doc.save);
    doc.save("test.pdf");
  });
});
