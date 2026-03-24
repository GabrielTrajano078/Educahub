import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { ClassroomModel } from "./classroom.model";
import { createClassroomSchema, listClassroomsSchema } from "./classes.schemas";

export const classesRouter = Router();

classesRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const filters = listClassroomsSchema.parse(req.query);
    const query = {
      ...(filters.schoolId ? { schoolId: filters.schoolId } : {}),
      ...(filters.grade ? { grade: filters.grade } : {}),
    };

    const classes = await ClassroomModel.find(query).sort({ createdAt: -1 }).lean();
    res.json(classes);
  } catch (error) {
    next(error);
  }
});

classesRouter.post(
  "/",
  requireAuth,
  requireRole("admin", "gestor", "coordenador"),
  async (req, res, next) => {
    try {
      const data = createClassroomSchema.parse(req.body);
      const classroom = await ClassroomModel.create(data);
      res.status(201).json({ id: String(classroom._id) });
    } catch (error) {
      next(error);
    }
  },
);
