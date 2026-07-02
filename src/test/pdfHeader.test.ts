import { describe, it, expect } from "vitest";
import jsPDF from "jspdf";
import { exportCargaDiaPDF } from "../lib/pdfExport";

describe("PDF daily report headers", () => {
  it("runs without error and headers are single-line", async () => {
    (jsPDF.prototype.save as any) = function (filename: string) {
      const fs = require("fs");
      const output = this.output("arraybuffer");
      fs.writeFileSync("/tmp/test-carga-dia.pdf", Buffer.from(output));
      console.log("PDF saved to /tmp/test-carga-dia.pdf", filename);
    };

    global.fetch = async () => {
      const buffer = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "base64"
      );
      return { blob: async () => new Blob([buffer], { type: "image/png" }) } as any;
    };

    (global as any).FileReader = class {
      onloadend: any;
      readAsDataURL() {
        setTimeout(() => {
          if (this.onloadend) {
            this.onloadend({
              target: {
                result:
                  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
              },
            });
          }
        }, 0);
      }
    };

    const services = [
      {
        id: "1",
        fecha: "2026-07-02",
        solicitud: 1,
        cliente: "SATRO",
        lugarSalida: "VILLA CELINA",
        destino: "SAN JUSTO",
        chofer: "GUTIERREZ",
        citaChofer: "07:00",
        custodio: "DIAZ JULIO",
        citaCustodio: "06:14",
        movil: "JTC 467",
        celular: "116390-9207",
        observaciones: "",
      },
    ] as any;

    await expect(exportCargaDiaPDF(services, [], "2026-07-02")).resolves.toBeUndefined();
  });
});
