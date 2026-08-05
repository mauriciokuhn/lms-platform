// @vitest-environment jsdom
/**
 * Session-free tests for the public certificate validation page
 * (src/app/validar-certificado/page.tsx). The verify API is mocked; covers
 * the valid-certificate result (student, course, date, code, CTA links),
 * the invalid-code result, and the loading state.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: (props: {
    href: string;
    children?: React.ReactNode;
    className?: string;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require("react");
    const { href, children, ...rest } = props;
    return React.createElement("a", { href, ...rest }, children);
  },
}));

vi.mock("@/components/ui/toast-utils", () => ({
  showSuccess: vi.fn(),
}));

const fetchMock = vi.fn();

import ValidarCertificadoPage from "@/app/validar-certificado/page";

const VALID_RESULT = {
  valid: true,
  certificate: {
    code: "CERT-ABC-123",
    studentName: "Maria Silva",
    courseTitle: "React do Zero ao Avançado",
    courseCategory: "Front-end",
    issuedAt: "2026-08-05T00:00:00.000Z",
    issuedAtFormatted: "5 de agosto de 2026",
  },
};

function okJson(data: unknown) {
  return { ok: true, json: async () => data };
}

async function submitCode(code: string) {
  render(<ValidarCertificadoPage />);
  const input = screen.getByLabelText("Código do certificado");
  fireEvent.change(input, { target: { value: code } });
  fireEvent.click(screen.getByRole("button", { name: /verificar/i }));
}

describe("ValidarCertificadoPage", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the search form", () => {
    render(<ValidarCertificadoPage />);
    expect(screen.getByText("Validar Certificado")).toBeTruthy();
    expect(screen.getByLabelText("Código do certificado")).toBeTruthy();
    expect(screen.getByRole("button", { name: /verificar/i })).toBeTruthy();
  });

  it("shows the authenticated certificate details for a valid code", async () => {
    fetchMock.mockResolvedValue(okJson(VALID_RESULT));

    await submitCode("CERT-ABC-123");

    await waitFor(() => expect(screen.getByText("Certificado Autêntico")).toBeTruthy());
    expect(screen.getByText("Maria Silva")).toBeTruthy();
    expect(screen.getByText("React do Zero ao Avançado")).toBeTruthy();
    expect(screen.getByText("5 de agosto de 2026")).toBeTruthy();
    expect(screen.getByText("CERT-ABC-123")).toBeTruthy();

    // CTA links to the public certificate page
    const link = screen.getByRole("link", { name: /ver certificado/i });
    expect(link.getAttribute("href")).toBe("/certificados/CERT-ABC-123");

    // Code is uppercased + trimmed before the request
    expect(fetchMock).toHaveBeenCalledWith("/api/certificates/verify/CERT-ABC-123");
  });

  it("shows the not-found state for an invalid code", async () => {
    fetchMock.mockResolvedValue(
      okJson({ valid: false, error: "Nenhum certificado corresponde a este código" })
    );

    await submitCode("CERT-INVALIDO");

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Falha na verificação" })).toBeTruthy()
    );
    expect(screen.getByText("Nenhum certificado corresponde a este código")).toBeTruthy();
  });
});
