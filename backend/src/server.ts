import { app } from "./app";
import { connectDatabase } from "./config/db";
import { env } from "./config/env";

async function bootstrap() {
  await connectDatabase();

  app.listen(env.PORT, () => {
    console.log(`API rodando na porta ${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error("Erro ao iniciar a aplicacao:", error);
  process.exit(1);
});
