import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

export type UserSettingsData = {
  soundEnabled: boolean;
  soundTone: "CHIME" | "POP" | "ALERT";
  vibrationEnabled: boolean;
  doNotDisturb: boolean;
  dndStartTime: string | null;
  dndEndTime: string | null;
};

const defaults: UserSettingsData = {
  soundEnabled: true,
  soundTone: "CHIME",
  vibrationEnabled: true,
  doNotDisturb: false,
  dndStartTime: null,
  dndEndTime: null,
};

/**
 * GET /api/settings
 *
 * Returns the authenticated user's notification preferences.
 * If no settings exist, returns defaults (not created yet).
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const settings = await db.userSettings.findUnique({
      where: { userId: session.user.id },
    });

    if (!settings) {
      return NextResponse.json(defaults);
    }

    return NextResponse.json({
      soundEnabled: settings.soundEnabled,
      soundTone: settings.soundTone,
      vibrationEnabled: settings.vibrationEnabled,
      doNotDisturb: settings.doNotDisturb,
      dndStartTime: settings.dndStartTime,
      dndEndTime: settings.dndEndTime,
    } satisfies UserSettingsData);
  } catch (error) {
    logger.error("GET /api/settings error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Erro ao buscar configurações" }, { status: 500 });
  }
}

/**
 * PATCH /api/settings
 *
 * Updates the authenticated user's notification preferences.
 * Creates settings if they don't exist yet (upsert).
 */
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();

    // Validate fields
    const validFields: (keyof UserSettingsData)[] = [
      "soundEnabled",
      "soundTone",
      "vibrationEnabled",
      "doNotDisturb",
      "dndStartTime",
      "dndEndTime",
    ];

    const data: Record<string, unknown> = {};

    for (const field of validFields) {
      if (field in body) {
        // Validate soundTone enum
        if (field === "soundTone" && !["CHIME", "POP", "ALERT"].includes(body[field])) {
          return NextResponse.json({ error: "Tom de som inválido" }, { status: 400 });
        }
        data[field] = body[field];
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nenhum campo válido para atualizar" }, { status: 400 });
    }

    const settings = await db.userSettings.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        ...data as unknown as Partial<UserSettingsData>,
      },
      update: data as unknown as Partial<UserSettingsData>,
    });

    return NextResponse.json({
      soundEnabled: settings.soundEnabled,
      soundTone: settings.soundTone,
      vibrationEnabled: settings.vibrationEnabled,
      doNotDisturb: settings.doNotDisturb,
      dndStartTime: settings.dndStartTime,
      dndEndTime: settings.dndEndTime,
    } satisfies UserSettingsData);
  } catch (error) {
    logger.error("PATCH /api/settings error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Erro ao salvar configurações" }, { status: 500 });
  }
}
