import { describe, expect, it } from "vitest";
import { buildCustodyPeakDays, classifyCustodyShift, getCustodyServiceGroups, rankCustodyPeakDays } from "@/lib/custodyPeaks";
import { ServiceEntry } from "@/lib/types";

function service(overrides: Partial<ServiceEntry>): ServiceEntry {
  return {
    id: Math.random().toString(), solicitud: 1, fecha: "2026-10-01", horaSolicitud: "", cliente: "Cliente",
    lugarSalida: "", destino: "", chofer: "", citaChofer: "", custodio: "", citaCustodio: "", movil: "",
    celular: "", salidaCenop: "", llegadaServicio: "", iniciaServicio: "", llegadaDestino: "",
    finalizaServicio: "", llegadaCenop: "", horaFrancoChofer: "", horaFrancoCustodio: "", ordenCarga: "",
    remito: "", continuaOrden: "", observaciones: "", horasProductivas: "", horasImproductivas1: "",
    horasImproductivas2: "", horasImproductivas: "", horasTotales: "", ...overrides,
  };
}

describe("picos de custodias", () => {
  it("clasifica los límites de día y noche", () => {
    expect(classifyCustodyShift([service({ iniciaServicio: "06:00" })])).toBe("dia");
    expect(classifyCustodyShift([service({ iniciaServicio: "17:59" })])).toBe("dia");
    expect(classifyCustodyShift([service({ iniciaServicio: "18:00" })])).toBe("noche");
    expect(classifyCustodyShift([service({ iniciaServicio: "05:59" })])).toBe("noche");
  });

  it("cuenta una sola custodia aunque tenga fila de chofer y custodio", () => {
    const rows = [
      service({ id: "a", solicitud: 7, chofer: "CHOFER", iniciaServicio: "08:00" }),
      service({ id: "b", solicitud: 7, custodio: "CUSTODIO", iniciaServicio: "08:00" }),
      service({ id: "c", solicitud: 8, iniciaServicio: "22:00" }),
    ];
    expect(buildCustodyPeakDays(rows)[0]).toMatchObject({ dia: 1, noche: 1, total: 2 });
  });

  it("excluye filas vacías y ordena el ranking según el turno", () => {
    const rows = [
      service({ id: "empty", solicitud: 99, cliente: "" }),
      service({ id: "a", solicitud: 1, fecha: "2026-10-01", iniciaServicio: "20:00" }),
      service({ id: "b", solicitud: 2, fecha: "2026-10-02", iniciaServicio: "21:00" }),
      service({ id: "c", solicitud: 3, fecha: "2026-10-02", iniciaServicio: "23:00" }),
    ];
    const ranked = rankCustodyPeakDays(buildCustodyPeakDays(rows), "noche");
    expect(ranked.map((day) => [day.fecha, day.noche])).toEqual([["2026-10-02", 2], ["2026-10-01", 1]]);
  });

  it("abre el detalle del día sin duplicar servicios y respeta el turno", () => {
    const rows = [
      service({ id: "a", solicitud: 7, chofer: "CHOFER", iniciaServicio: "08:00" }),
      service({ id: "b", solicitud: 7, custodio: "CUSTODIO", iniciaServicio: "08:00" }),
      service({ id: "c", solicitud: 8, iniciaServicio: "22:00" }),
      service({ id: "d", solicitud: 9, fecha: "2026-10-02", iniciaServicio: "09:00" }),
    ];

    const all = getCustodyServiceGroups(rows, "2026-10-01", "todos");
    const day = getCustodyServiceGroups(rows, "2026-10-01", "dia");
    const night = getCustodyServiceGroups(rows, "2026-10-01", "noche");

    expect(all).toHaveLength(2);
    expect(day).toHaveLength(1);
    expect(day[0].entries).toHaveLength(2);
    expect(night.map((group) => group.primary.solicitud)).toEqual([8]);
  });
});
