import jsPDF from "jspdf";
import "jspdf-autotable";
import fs from "fs";

(jsPDF.prototype.save as any) = function (filename: string) {
  const output = this.output("arraybuffer");
  fs.writeFileSync("/tmp/test-save.pdf", Buffer.from(output));
  console.log("save called", filename, "size", fs.statSync("/tmp/test-save.pdf").size);
};

const doc = new jsPDF({ orientation: "landscape", format: "a4", unit: "mm" });
doc.text("Hello", 10, 10);
doc.save("hello.pdf");
console.log("exists", fs.existsSync("/tmp/test-save.pdf"));
