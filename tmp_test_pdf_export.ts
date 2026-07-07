import jsPDF from "jspdf";
import "jspdf-autotable";
import fs from "fs";

const PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

(globalThis as any).fetch = async () => {
  const buffer = Buffer.from(PNG_BASE64, "base64");
  return { blob: async () => new Blob([buffer], { type: "image/png" }) } as any;
};

(globalThis as any).FileReader = class {
  onloadend: any;
  readAsDataURL() {
    setTimeout(() => {
      if (this.onloadend) {
        this.onloadend({
          target: {
            result: `data:image/png;base64,${PNG_BASE64}`,
          },
        });
      }
    }, 0);
  }
};

(jsPDF.prototype.save as any) = function (filename: string) {
  const output = this.output("arraybuffer");
  fs.writeFileSync("/mnt/documents/test-export.pdf", Buffer.from(output));
  console.log("PDF saved to /mnt/documents/test-export.pdf", filename);
};

import { exportCargaDiaPDF } from "/dev-server/src/lib/pdfExport.ts";

const services = [
  {
    id: "1",
    fecha: "2026-07-08",
    solicitud: 1,
    cliente: "SATRO",
    lugarSalida: "VILLA CELINA",
    destino: "RAMALLO",
    chofer: "NAVAZA LEONEL",
    citaChofer: "06:00",
    custodio: "DIAZ JULIO",
    citaCustodio: "06:00",
    movil: "LVX 589",
    celular: "112438-9799",
    observaciones: "",
    ordenCarga: "OC-1234",
    continuaOrden: "",
  },
  {
    id: "2",
    fecha: "2026-07-08",
    solicitud: 2,
    cliente: "CENOP",
    lugarSalida: "CENOP",
    destino: "PLAYERO",
    chofer: "",
    citaChofer: "",
    custodio: "AUGIER ANDRÉS",
    citaCustodio: "05:30",
    movil: "",
    celular: "113901-4887",
    observaciones: "incompleto",
    ordenCarga: "",
    continuaOrden: "",
  },
] as any;

exportCargaDiaPDF(services, [], "2026-07-08").then(() => {
  console.log("done");
});
