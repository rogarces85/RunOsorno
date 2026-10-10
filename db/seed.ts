import { hashSync } from "bcryptjs";
import { and, eq } from "drizzle-orm";
import {
  BASE_SESSION_TYPES,
  DEFAULT_NOT_DONE_REASONS,
} from "../lib/config/constants";
import { db } from "../lib/db/index";
import { settings, templates, users, type TemplateSection } from "../lib/db/schema";

const ADMIN_EMAIL = "admin@runosorno.cl";
const ADMIN_PASSWORD = "Admin1234!";

const DEFAULT_SETTINGS = [
  { key: "max_teams_per_coach", value: 10 },
  { key: "max_athletes_per_team", value: 50 },
  { key: "edit_window_hours", value: 48 },
  {
    key: "not_done_reasons",
    value: [...DEFAULT_NOT_DONE_REASONS],
  },
  {
    key: "base_session_types",
    value: [...BASE_SESSION_TYPES],
  },
];

type OfficialSeed = {
  name: string;
  sessionType: string;
  sections: {
    title: string;
    type: TemplateSection["type"];
    content: string;
  }[];
};

const OFFICIAL_TEMPLATES: OfficialSeed[] = [
  {
    name: "Series 6×400m",
    sessionType: "series",
    sections: [
      {
        title: "Calentamiento",
        type: "warmup",
        content:
          "10-15 min de trote suave, 4 progresivos de 30 m y movilidad articular.",
      },
      {
        title: "6×400m",
        type: "main",
        content:
          "6×400 m a ritmo de 5K con 90 s de trote de recuperación entre repeticiones.",
      },
      {
        title: "Enfriamiento",
        type: "cooldown",
        content:
          "10 min de trote suave + estiramientos de piernas (isquios, cuádriceps, gemelos).",
      },
    ],
  },
  {
    name: "Intervalos 5×1000m",
    sessionType: "intervalos",
    sections: [
      {
        title: "Calentamiento",
        type: "warmup",
        content:
          "12 min de trote suave, 3 progresivos de 40 s y movilidad.",
      },
      {
        title: "5×1000m",
        type: "main",
        content:
          "5×1000 m a ritmo de 10K con 2 min de trote suave entre repeticiones.",
      },
      {
        title: "Enfriamiento",
        type: "cooldown",
        content: "10 min de trote suave + estiramientos.",
      },
    ],
  },
  {
    name: "Fondo largo",
    sessionType: "fondos",
    sections: [
      {
        title: "Calentamiento",
        type: "warmup",
        content: "5 min de caminata rápida + trote suave progresivo.",
      },
      {
        title: "Fondo",
        type: "main",
        content:
          "16-21 km a ritmo cómodo (conversacional). Lleva hidratación y controla el ritmo en las cuestas.",
      },
      {
        title: "Enfriamiento",
        type: "cooldown",
        content:
          "8-10 min de trote muy suave o caminata + estiramientos largos.",
      },
    ],
  },
  {
    name: "Tempo 20 min",
    sessionType: "tempo",
    sections: [
      {
        title: "Calentamiento",
        type: "warmup",
        content: "10 min de trote suave + 3×1 min progresivo.",
      },
      {
        title: "Tempo",
        type: "main",
        content:
          "20 min a ritmo de umbral (esfuerzo 7-8/10, difícil pero sostenible).",
      },
      {
        title: "Enfriamiento",
        type: "cooldown",
        content: "10 min de trote suave + estiramientos.",
      },
    ],
  },
  {
    name: "Recuperación activa",
    sessionType: "recuperacion",
    sections: [
      {
        title: "Calentamiento",
        type: "warmup",
        content: "8 min de trote muy suave + movilidad.",
      },
      {
        title: "Trote suave",
        type: "main",
        content:
          "30-40 min muy suaves (ritmo conversacional, esfuerzo ≤5/10). Opcional: 4×100 m progresivos suaves.",
      },
      {
        title: "Enfriamiento",
        type: "cooldown",
        content: "5 min de caminata + estiramientos.",
      },
    ],
  },
];

async function main() {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, ADMIN_EMAIL));

  if (existing.length === 0) {
    await db.insert(users).values({
      id: crypto.randomUUID(),
      name: "Administrador",
      email: ADMIN_EMAIL,
      passwordHash: hashSync(ADMIN_PASSWORD, 10),
      role: "admin",
      isActive: true,
      mustChangePassword: true,
    });
    console.log(`Admin creado: ${ADMIN_EMAIL}`);
  } else {
    console.log("Admin ya existe, se omite");
  }

  for (const setting of DEFAULT_SETTINGS) {
    await db
      .insert(settings)
      .values(setting)
      .onDuplicateKeyUpdate({
        set: { value: setting.value, updatedAt: new Date() },
      });
  }
  console.log(`Settings verificadas: ${DEFAULT_SETTINGS.length} claves`);

  let createdOfficials = 0;
  for (const official of OFFICIAL_TEMPLATES) {
    const existingOfficial = await db
      .select({ id: templates.id })
      .from(templates)
      .where(
        and(
          eq(templates.isOfficial, true),
          eq(templates.name, official.name),
        ),
      )
      .limit(1);
    if (existingOfficial.length > 0) {
      continue;
    }
    await db.insert(templates).values({
      id: crypto.randomUUID(),
      coachId: null,
      groupId: null,
      name: official.name,
      sessionType: official.sessionType,
      isOfficial: true,
      isShared: false,
      structure: official.sections.map((section, index) => ({
        id: crypto.randomUUID(),
        order: index,
        title: section.title,
        type: section.type,
        content: section.content,
      })),
    });
    createdOfficials += 1;
  }
  console.log(
    `Plantillas oficiales: ${createdOfficials} creadas / ${OFFICIAL_TEMPLATES.length} definidas`,
  );

  const admin = await db
    .select({ id: users.id, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.email, ADMIN_EMAIL));

  if (admin.length !== 1) {
    throw new Error("Admin no encontrado tras el seed");
  }
  console.log(
    `OK — admin verificado (id=${admin[0].id}, role=${admin[0].role})`,
  );

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
