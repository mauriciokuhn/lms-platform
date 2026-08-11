/**
 * Unit tests for the certificate PDF generator (src/lib/certificate-pdf.ts).
 *
 * `jspdf` and `qrcode` are mocked so no canvas/PDF engine is needed in the
 * test env. Covers the A4-landscape layout calls (borders, title, student,
 * course, date/code), the QR generation + embedding, the graceful fallback
 * when QR generation fails, and the sanitized file name used for the download.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const docMock = vi.hoisted(() => ({
  setDrawColor: vi.fn(),
  setLineWidth: vi.fn(),
  rect: vi.fn(),
  circle: vi.fn(),
  setFillColor: vi.fn(),
  setTextColor: vi.fn(),
  setFont: vi.fn(),
  setFontSize: vi.fn(),
  setProperties: vi.fn(),
  text: vi.fn(),
  line: vi.fn(),
  triangle: vi.fn(),
  addImage: vi.fn(),
  save: vi.fn(),
}));

const jsPDFMock = vi.hoisted(() =>
  vi.fn().mockImplementation(() => docMock)
);

const toDataURLMock = vi.hoisted(() => vi.fn());

vi.mock("jspdf", () => ({
  jsPDF: jsPDFMock,
}));

vi.mock("qrcode", () => ({
  default: { toDataURL: toDataURLMock },
}));

import { generateCertificatePdf } from "@/lib/certificate-pdf";

const DATA = {
  studentName: "Maria Silva",
  courseTitle: "React do Zero ao Avançado",
  code: "CERT-ABC-123",
  issuedAtFormatted: "05/08/2026",
  verificationUrl: "https://lms.example.com/certificados/CERT-ABC-123",
};

describe("generateCertificatePdf", () => {
  beforeEach(() => {
    for (const fn of Object.values(docMock)) fn.mockReset();
    jsPDFMock.mockClear();
    toDataURLMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates an A4 landscape document", async () => {
    await generateCertificatePdf(DATA);

    expect(jsPDFMock).toHaveBeenCalledTimes(1);
    expect(jsPDFMock).toHaveBeenCalledWith({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });
  });

  it("draws the certificate content (title, student, course, meta)", async () => {
    await generateCertificatePdf(DATA);

    const texts = docMock.text.mock.calls.map((c) => c[0]);
    expect(texts).toContain("CERTIFICADO");
    expect(texts).toContain("Maria Silva");
    expect(texts).toContain("React do Zero ao Avançado");
    expect(texts).toContain("Data de Conclusão");
    expect(texts).toContain("Código");
    expect(texts).toContain("05/08/2026");
    expect(texts).toContain("CERT-ABC-123");
    expect(texts).toContain("Ponto do Saber");

    // gold frame is drawn
    expect(docMock.rect).toHaveBeenCalled();

    // brand icon (lightbulb over open book) is drawn in the header
    expect(docMock.triangle).toHaveBeenCalled();
    expect(docMock.circle.mock.calls.length).toBeGreaterThan(2);
  });

  it("sets document metadata for indexing", async () => {
    await generateCertificatePdf(DATA);

    expect(docMock.setProperties).toHaveBeenCalledWith({
      title: "Certificado — React do Zero ao Avançado",
      subject: "Certificado de conclusão de curso",
      author: "Maria Silva",
      keywords: expect.stringContaining("CERT-ABC-123"),
      creator: "Ponto do Saber",
    });
  });

  it("writes the verification URL as selectable text", async () => {
    await generateCertificatePdf(DATA);

    const texts = docMock.text.mock.calls.map((c) => c[0]);
    expect(texts).toContain(DATA.verificationUrl);
  });

  it("embeds a QR code pointing to the verification URL", async () => {
    toDataURLMock.mockResolvedValue("data:image/png;base64,QRDATA");

    const result = await generateCertificatePdf(DATA);

    expect(toDataURLMock).toHaveBeenCalledWith(DATA.verificationUrl, expect.any(Object));
    expect(docMock.addImage).toHaveBeenCalledWith(
      "data:image/png;base64,QRDATA",
      "PNG",
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number)
    );
    expect(result.qrIncluded).toBe(true);
  });

  it("saves the PDF with a sanitized file name", async () => {
    await generateCertificatePdf(DATA);

    expect(docMock.save).toHaveBeenCalledWith("certificado-CERT-ABC-123.pdf");
  });

  it("still produces the certificate when QR generation fails", async () => {
    toDataURLMock.mockRejectedValue(new Error("no canvas"));

    const result = await generateCertificatePdf(DATA);

    expect(docMock.addImage).not.toHaveBeenCalled();
    expect(docMock.save).toHaveBeenCalled();
    expect(result.qrIncluded).toBe(false);
  });

  it("sanitizes unsafe characters from the file name", async () => {
    await generateCertificatePdf({
      ...DATA,
      code: "abc/def:ghi?jkl*mno",
    });

    expect(docMock.save).toHaveBeenCalledWith("certificado-abcdefghijklmno.pdf");
  });
});
