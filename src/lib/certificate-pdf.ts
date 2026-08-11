import { jsPDF } from "jspdf";
import QRCode from "qrcode";

/**
 * Certificate PDF generator.
 *
 * Builds an A4-landscape certificate (mirroring the on-screen design) with a
 * QR code pointing to the public verification page, and triggers a download
 * in the browser.
 */

export interface CertificatePdfData {
  studentName: string;
  courseTitle: string;
  code: string;
  issuedAtFormatted: string;
  /** Absolute URL of the public verification page (/certificados/{code}). */
  verificationUrl: string;
}

/** A4 landscape dimensions in mm. */
const PAGE_W = 297;
const PAGE_H = 210;

function sanitizeFileName(code: string): string {
  return `certificado-${code.replace(/[^a-zA-Z0-9-_]/g, "")}.pdf`;
}

/**
 * Draws the "Ponto do Saber" brand icon (lightbulb over an open book) using
 * jsPDF vector primitives — no raster assets or network required, so the
 * certificate renders identically offline. `x`/`y` anchor the top-left.
 */
function drawBrandIcon(doc: jsPDF, x: number, y: number, s = 1) {
  const amber = [217, 119, 6] as const; // amber-600
  const white = [255, 255, 255] as const;

  // Light rays
  doc.setDrawColor(...amber);
  doc.setLineWidth(0.5 * s);
  doc.line(x + 2.5 * s, y + 1.7 * s, x + 2.5 * s, y + 0.4 * s); // center
  doc.line(x + 1.9 * s, y + 1.9 * s, x + 1.4 * s, y + 0.8 * s); // left
  doc.line(x + 3.1 * s, y + 1.9 * s, x + 3.6 * s, y + 0.8 * s); // right

  // Lightbulb
  doc.setFillColor(...amber);
  doc.circle(x + 2.5 * s, y + 4.6 * s, 2.4 * s, "F");
  doc.setFillColor(...white);
  doc.circle(x + 2.0 * s, y + 3.9 * s, 0.7 * s, "F"); // highlight
  doc.setFillColor(...amber);
  doc.rect(x + 1.9 * s, y + 7.1 * s, 1.2 * s, 1.0 * s, "F");
  doc.rect(x + 2.2 * s, y + 8.1 * s, 0.6 * s, 0.7 * s, "F");

  // Open book
  doc.setFillColor(...amber);
  doc.triangle(x + 0.4 * s, y + 11.8 * s, x + 2.5 * s, y + 13.2 * s, x + 2.5 * s, y + 10.4 * s, "F");
  doc.triangle(x + 4.6 * s, y + 11.8 * s, x + 2.5 * s, y + 13.2 * s, x + 2.5 * s, y + 10.4 * s, "F");
  doc.setDrawColor(...white);
  doc.setLineWidth(0.4 * s);
  doc.line(x + 2.5 * s, y + 10.4 * s, x + 2.5 * s, y + 13.2 * s); // spine
}

export async function generateCertificatePdf(
  data: CertificatePdfData
): Promise<{ fileName: string; qrIncluded: boolean }> {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const centerX = PAGE_W / 2;

  // ── Document metadata (indexable/searchable in PDF readers) ──
  doc.setProperties({
    title: `Certificado — ${data.courseTitle}`,
    subject: "Certificado de conclusão de curso",
    author: data.studentName,
    keywords: `certificado, conclusão, ${data.courseTitle}, ${data.code}`,
    creator: "Ponto do Saber",
  });

  // ── Border frame (amber, like the on-screen certificate) ──
  doc.setDrawColor(251, 191, 36); // amber-400
  doc.setLineWidth(3);
  doc.rect(5, 5, PAGE_W - 10, PAGE_H - 10);
  doc.setLineWidth(0.5);
  doc.rect(10, 10, PAGE_W - 20, PAGE_H - 20);

  // ── Brand header (Ponto do Saber icon + name) ──
  drawBrandIcon(doc, 22, 18, 1.1);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(217, 119, 6); // amber-600
  doc.text("Ponto do Saber", 30, 28);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(161, 161, 170); // zinc-400
  doc.text("Certificado Digital", 30, 32.5);
  // Top-right icon (mirrors the header, no text)
  drawBrandIcon(doc, PAGE_W - 27.5, 18, 1.1);

  // ── Badge (golden circle with a drawn checkmark) ──
  // Note: "✓" is not in WinAnsiEncoding (jsPDF built-in helvetica), so the
  // check is drawn with two strokes instead of a text glyph.
  doc.setFillColor(251, 191, 36);
  doc.circle(centerX, 34, 11, "F");
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1.6);
  doc.line(centerX - 5.5, 34, centerX - 1.5, 38);
  doc.line(centerX - 1.5, 38, centerX + 6, 29.5);

  // ── Title ──
  doc.setTextColor(24, 24, 27); // zinc-900
  doc.setFont("helvetica", "bold");
  doc.setFontSize(40);
  doc.text("CERTIFICADO", centerX, 58, { align: "center" });

  // gold underline
  doc.setDrawColor(251, 191, 36);
  doc.setLineWidth(1);
  doc.line(centerX - 40, 63, centerX + 40, 63);

  // ── Body ──
  doc.setFont("helvetica", "normal");
  doc.setFontSize(16);
  doc.setTextColor(82, 82, 91); // zinc-500
  doc.text("Certificamos que", centerX, 82, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(24, 24, 27);
  doc.text(data.studentName, centerX, 96, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(16);
  doc.setTextColor(82, 82, 91);
  doc.text("concluiu com êxito o curso", centerX, 110, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(217, 119, 6); // amber-600
  doc.text(data.courseTitle, centerX, 124, { align: "center" });

  // ── Separator + meta (date / code) ──
  doc.setDrawColor(228, 228, 231); // zinc-200
  doc.setLineWidth(0.4);
  doc.line(centerX - 70, 136, centerX + 70, 136);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(24, 24, 27);
  doc.text("Data de Conclusão", centerX - 35, 148, { align: "center" });
  doc.text("Código", centerX + 35, 148, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(113, 113, 122); // zinc-500
  doc.text(data.issuedAtFormatted, centerX - 35, 154, { align: "center" });
  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  doc.text(data.code, centerX + 35, 154, { align: "center" });

  // ── Footer signature ──
  doc.setFont("helvetica", "normal");
  doc.setDrawColor(212, 212, 216); // zinc-300
  doc.line(centerX - 45, 172, centerX + 45, 172);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(24, 24, 27);
  doc.text("Ponto do Saber", centerX, 178, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(113, 113, 122);
  doc.text("Certificado Digital", centerX, 183, { align: "center" });

  // ── QR code (verification) ──
  let qrIncluded = false;
  try {
    const qrDataUrl = await QRCode.toDataURL(data.verificationUrl, {
      margin: 1,
      width: 320,
      color: { dark: "#18181b", light: "#ffffff" },
    });
    const qrSize = 30;
    doc.addImage(
      qrDataUrl,
      "PNG",
      PAGE_W - qrSize - 22,
      PAGE_H - qrSize - 24,
      qrSize,
      qrSize
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(113, 113, 122);
    doc.text("Escanear para verificar", PAGE_W - qrSize - 22 + qrSize / 2, PAGE_H - 21, {
      align: "center",
    });
    qrIncluded = true;
  } catch {
    // QR generation failed (e.g. no canvas support) — certificate is still valid.
    qrIncluded = false;
  }

  // ── Verification URL as selectable text (fallback to the QR) ──
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(161, 161, 170); // zinc-400
  doc.text(data.verificationUrl, 14, PAGE_H - 14);

  const fileName = sanitizeFileName(data.code);
  doc.save(fileName);
  return { fileName, qrIncluded };
}
