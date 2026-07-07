import jsPDF from "jspdf";
import "jspdf-autotable";
import fs from "fs";

console.log("prototype save before:", (jsPDF.prototype.save as any)?.toString().slice(0, 100));
(jsPDF.prototype.save as any) = function (filename: string) {
  const output = this.output("arraybuffer");
  fs.writeFileSync("/tmp/test-save.pdf", Buffer.from(output));
  console.log("save called", filename, "size", fs.statSync("/tmp/test-save.pdf").size);
};
console.log("prototype save after:", (jsPDF.prototype.save as any)?.toString().slice(0, 100));

const doc = new jsPDF({ orientation: "landscape", format: "a4", unit: "mm" });
console.log("doc.save is prototype?", doc.save === jsPDF.prototype.save);
console.log("doc.save source:", (doc.save as any)?.toString().slice(0, 100));
doc.text("Hello", 10, 10);
doc.save("hello.pdf");
console.log("exists", fs.existsSync("/tmp/test-save.pdf"));

