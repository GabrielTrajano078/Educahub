import { app } from "./app";
import { connectDatabase } from "./config/db";
import { env } from "./config/env";
import {
  ClassroomNormalizedNameCollisionError,
  migrateClassroomNormalizedName,
} from "./lib/migrations/migrate-classroom-normalized-name";
import {
  migrateSchoolNormalizedName,
  SchoolNormalizedNameCollisionError,
} from "./lib/migrations/migrate-school-normalized-name";
import {
  migrateStudentNormalizedFullName,
  StudentNormalizedFullNameCollisionError,
} from "./lib/migrations/migrate-student-normalized-full-name";

async function runStartupMigrations(): Promise<void> {
  if (env.NODE_ENV === "test") {
    return;
  }

  const migrations = [
    { label: "Escolas", run: migrateSchoolNormalizedName },
    { label: "Turmas", run: migrateClassroomNormalizedName },
    { label: "Alunos", run: migrateStudentNormalizedFullName },
  ] as const;

  for (const { label, run } of migrations) {
    const result = await run();
    if (result.skipped) {
      continue;
    }
    if (result.updated > 0) {
      console.log(`[migrate] ${label} (${result.migrationId}): ${result.updated} documento(s) atualizado(s).`);
    } else {
      console.log(`[migrate] ${label} (${result.migrationId}): migração aplicada.`);
    }
  }
}

async function bootstrap() {
  await connectDatabase();

  try {
    await runStartupMigrations();
  } catch (error) {
    if (error instanceof SchoolNormalizedNameCollisionError) {
      console.error("[migrate] Colisões em escolas (municipalityCode + normalizedName):");
      console.error(JSON.stringify(error.collisions, null, 2));
      process.exit(2);
    }
    if (error instanceof ClassroomNormalizedNameCollisionError) {
      console.error("[migrate] Colisões em turmas (schoolId + normalizedName):");
      console.error(JSON.stringify(error.collisions, null, 2));
      process.exit(2);
    }
    if (error instanceof StudentNormalizedFullNameCollisionError) {
      console.error("[migrate] Colisões em alunos (classroomId + normalizedFullName):");
      console.error(JSON.stringify(error.collisions, null, 2));
      process.exit(2);
    }
    throw error;
  }

  app.listen(env.PORT, () => {
    console.log(`API rodando na porta ${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error("Erro ao iniciar a aplicacao:", error);
  process.exit(1);
});
