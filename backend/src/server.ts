import { app } from "./app";
import { connectDatabase } from "./config/db";
import { env } from "./config/env";
import {
  migrateSchoolNormalizedName,
  SchoolNormalizedNameCollisionError,
} from "./lib/migrations/migrate-school-normalized-name";

async function runStartupMigrations(): Promise<void> {
  if (env.NODE_ENV === "test") {
    return;
  }

  const result = await migrateSchoolNormalizedName();
  if (result.skipped) {
    return;
  }
  if (result.updated > 0) {
    console.log(`[migrate] Escolas (${result.migrationId}): ${result.updated} documento(s) atualizado(s).`);
  } else {
    console.log(`[migrate] Escolas (${result.migrationId}): migração aplicada.`);
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
