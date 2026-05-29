import { app } from "./app";
import { connectDatabase } from "./config/db";
import { env } from "./config/env";
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

  const schoolResult = await migrateSchoolNormalizedName();
  if (!schoolResult.skipped) {
    if (schoolResult.updated > 0) {
      console.log(`[migrate] Escolas (${schoolResult.migrationId}): ${schoolResult.updated} documento(s) atualizado(s).`);
    } else {
      console.log(`[migrate] Escolas (${schoolResult.migrationId}): migração aplicada.`);
    }
  }

  const studentResult = await migrateStudentNormalizedFullName();
  if (studentResult.skipped) {
    return;
  }
  if (studentResult.updated > 0) {
    console.log(`[migrate] Alunos (${studentResult.migrationId}): ${studentResult.updated} documento(s) atualizado(s).`);
  } else {
    console.log(`[migrate] Alunos (${studentResult.migrationId}): migração aplicada.`);
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
