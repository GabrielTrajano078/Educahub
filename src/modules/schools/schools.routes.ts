import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { SchoolModel } from "./school.model";
import { createSchoolSchema } from "./schools.schemas";

export const schoolsRouter = Router();

schoolsRouter.get("/", requireAuth, requireRole("admin", "gestor"), async (_req, res, next) => {
  try {
    const schools = await SchoolModel.find().sort({ name: 1 }).lean();
    res.json(schools);
  } catch (error) {
    next(error);
  }
});

schoolsRouter.post("/", requireAuth, requireRole("admin", "gestor"), async (req, res, next) => {
  try {
    const data = createSchoolSchema.parse(req.body);
    const school = await SchoolModel.create(data);
    res.status(201).json({ id: String(school._id) });
  } catch (error) {
    next(error);
  }
});
