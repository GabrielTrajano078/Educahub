import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { ZodError } from "zod";
import { authRouter } from "./modules/auth/auth.routes";
import { classesRouter } from "./modules/classes/classes.routes";
import { examsRouter } from "./modules/exams/exams.routes";
import { questionsRouter } from "./modules/questions/questions.routes";
import { resultsRouter } from "./modules/results/results.routes";
import { schoolsRouter } from "./modules/schools/schools.routes";
import { studentsRouter } from "./modules/students/students.routes";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/schools", schoolsRouter);
app.use("/api/classes", classesRouter);
app.use("/api/students", studentsRouter);
app.use("/api/questions", questionsRouter);
app.use("/api/exams", examsRouter);
app.use("/api/results", resultsRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof ZodError) {
    res.status(400).json({ message: "Erro de validacao", issues: err.issues });
    return;
  }

  console.error(err);
  res.status(500).json({ message: "Erro interno do servidor." });
});
