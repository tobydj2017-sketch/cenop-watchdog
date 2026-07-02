import { describe, it, expect } from "vitest";
import jsPDF from "jspdf";

describe("page width", () => {
  it("landscape A4 width is 297", () => {
    const doc = new jsPDF({ orientation: "landscape", format: "a4", unit: "mm" });
    console.log("landscape width", doc.internal.pageSize.getWidth(), "height", doc.internal.pageSize.getHeight());
    expect(doc.internal.pageSize.getWidth()).toBe(297);
  });
});
