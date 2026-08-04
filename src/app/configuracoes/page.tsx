"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUserSettings } from "@/lib/hooks/use-user-settings";
import type { UserSettingsData } from "@/app/api/settings/route";
import { useNotificationAlert } from "@/components/ui/notification-bell";
import { GamificationWidget } from "@/components/ui/gamification-display";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NotificationBell } from "@/components/ui/notification-bell";
import { toast } from "sonner";

const toneMeta = {
  CHIME: { label: "Chime Suave", icon: "🔔", desc: "Tom musical de dois tons — agradável e discreto" },
  POP: { label: "Pop Rápido", icon: "💬", desc: "Estalo curto e seco — minimalista" },
  ALERT: { label: "Alerta", icon: "⚠️", desc: "Tom mais intenso com vibrato — não passa despercebido" },
} as const;

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { settings, loading, updateSettings } = useUserSettings();
  const notifyAlert = useNotificationAlert();
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user) router.push("/login");
  }, [session, router]);

  if (!session?.user) return null;

  const handleToggle = async (field: string, value: boolean) => {
    setSaving(field);
    const ok = await updateSettings({ [field]: value } as Partial<UserSettingsData>);
    if (ok) toast.success("Configuração atualizada!");
    else toast.error("Erro ao salvar");
    setSaving(null);
  };

  const handleToneChange = async (tone: "CHIME" | "POP" | "ALERT") => {
    setSaving("tone");
    const ok = await updateSettings({ soundTone: tone });
    if (ok) {
      toast.success(`Tom alterado para "${toneMeta[tone].label}"`);
      // Preview the selected tone
      notifyAlert(tone);
    } else toast.error("Erro ao salvar");
    setSaving(null);
  };

  const handleTimeChange = async (field: "dndStartTime" | "dndEndTime", value: string) => {
    setSaving(field);
    const ok = await updateSettings({ [field]: value || null } as Partial<UserSettingsData>);
    if (ok) toast.success("Horário atualizado!");
    else toast.error("Erro ao salvar");
    setSaving(null);
  };

  // Skeleton while loading
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <Header userName={session.user.name || session.user.email || ""} />
        <main className="mx-auto max-w-2xl px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-32 rounded-xl bg-zinc-100 dark:bg-zinc-900" />
            <div className="h-32 rounded-xl bg-zinc-100 dark:bg-zinc-900" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Header userName={session.user.name || session.user.email || ""} />

      <main className="mx-auto max-w-2xl px-4 py-8">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Configurações</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Personalize sua experiência de notificações na plataforma.
          </p>
        </div>

        <div className="space-y-6">
          {/* ── Som ── */}
          <SettingsCard title="Som das Notificações" icon="🔊">
            <ToggleRow
              label="Ativar som"
              description="Toca um breve aviso sonoro ao receber notificações"
              enabled={settings.soundEnabled}
              loading={saving === "soundEnabled"}
              onChange={(v) => handleToggle("soundEnabled", v)}
            />

            {settings.soundEnabled && (
              <div className="mt-4 space-y-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Tom da notificação
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(Object.entries(toneMeta) as [ "CHIME" | "POP" | "ALERT", typeof toneMeta["CHIME"]][]).map(
                    ([key, meta]) => (
                      <button
                        key={key}
                        onClick={() => handleToneChange(key)}
                        disabled={saving === "tone"}
                        className={`group relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all ${
                          settings.soundTone === key
                            ? "border-zinc-900 bg-zinc-900 text-white shadow-lg dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                            : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-500"
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        <span className="text-2xl">{meta.icon}</span>
                        <span className="text-sm font-semibold">{meta.label}</span>
                        <span className="text-[10px] leading-tight text-zinc-400">{meta.desc}</span>
                        {settings.soundTone === key && (
                          <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        )}
                        {saving === "tone" && settings.soundTone === key && (
                          <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/60 dark:bg-zinc-900/60">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-900" />
                          </span>
                        )}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
          </SettingsCard>

          {/* ── Vibração ── */}
          <SettingsCard title="Vibração" icon="📳">
            <ToggleRow
              label="Ativar vibração"
              description="Dispositivo vibra ao receber notificações (suportado em dispositivos móveis)"
              enabled={settings.vibrationEnabled}
              loading={saving === "vibrationEnabled"}
              onChange={(v) => handleToggle("vibrationEnabled", v)}
            />
          </SettingsCard>

          {/* ── Não Perturbe ── */}
          <SettingsCard title="Não Perturbe" icon="🌙">
            <ToggleRow
              label="Ativar modo silencioso"
              description="Desativa som e vibração durante o período configurado"
              enabled={settings.doNotDisturb}
              loading={saving === "doNotDisturb"}
              onChange={(v) => handleToggle("doNotDisturb", v)}
            />

            {settings.doNotDisturb && (
              <div className="mt-4 grid gap-4 border-t border-zinc-100 pt-4 sm:grid-cols-2 dark:border-zinc-800">
                <TimeField
                  label="Início"
                  value={settings.dndStartTime || ""}
                  loading={saving === "dndStartTime"}
                  onChange={(v) => handleTimeChange("dndStartTime", v)}
                />
                <TimeField
                  label="Fim"
                  value={settings.dndEndTime || ""}
                  loading={saving === "dndEndTime"}
                  onChange={(v) => handleTimeChange("dndEndTime", v)}
                />
              </div>
            )}
          </SettingsCard>

          {/* ── Preview Card ── */}
          <SettingsCard title="Prévia" icon="🎯">
            <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
              Clique no botão abaixo para ouvir o tom selecionado e testar a vibração.
            </p>
            <button
              onClick={() => notifyAlert(settings.soundTone)}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 hover:shadow-md dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
              Testar {toneMeta[settings.soundTone].label}
            </button>
          </SettingsCard>
        </div>
      </main>
    </div>
  );
}

// ──────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────

function Header({ userName }: { userName: string }) {
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-white">Configurações</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/meus-cursos" className="hidden text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 sm:block">Meus Cursos</Link>
          <GamificationWidget />
          <NotificationBell />
          <ThemeToggle />
          <span className="hidden text-sm text-zinc-500 dark:text-zinc-400 sm:block">{userName}</span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}

function SettingsCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  enabled,
  loading,
  onChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  loading: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-900 dark:text-white">{label}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        disabled={loading}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
          enabled ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-200 dark:bg-zinc-700"
        }`}
        role="switch"
        aria-checked={enabled}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out ${
            enabled ? "translate-x-5" : "translate-x-0"
          } dark:bg-zinc-900`}
        />
      </button>
    </div>
  );
}

function TimeField({
  label,
  value,
  loading,
  onChange,
}: {
  label: string;
  value: string;
  loading: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</label>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white dark:focus:border-zinc-400"
      />
    </div>
  );
}
