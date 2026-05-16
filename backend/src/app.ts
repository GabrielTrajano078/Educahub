import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import swaggerUi from "swagger-ui-express";
import { openApiDocument } from "./docs/openapi";
import { handleExpressError } from "./lib/express-error-handler";
import { getUploadRoot } from "./lib/file-storage";
import { authRouter } from "./modules/auth/auth.routes";
import { usersRouter } from "./modules/auth/users.routes";
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
app.use("/uploads", express.static(path.resolve(getUploadRoot())));
app.use("/docs", (_req, res, next) => {
  res.removeHeader("Content-Security-Policy");
  next();
});
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/openapi.json", (_req, res) => {
  res.json(openApiDocument);
});

app.use("/api/auth", authRouter);
app.use("/api/auth", usersRouter);
app.use("/api/schools", schoolsRouter);
app.use("/api/classes", classesRouter);
app.use("/api/students", studentsRouter);
app.use("/api/questions", questionsRouter);
app.use("/api/exams", examsRouter);
app.use("/api/results", resultsRouter);

app.use(handleExpressError);
