import { Types } from "mongoose";
import { Router } from "express";
import { canAccessSchool } from "../../lib/access";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { ClassroomModel } from "./classroom.model";
import { createClassroomSchema, listClassroomsSchema } from "./classes.schemas";

export const classesRouter = Router();

classesRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const filters = listClassroomsSchema.parse(req.query);
    const query: Record<string, unknown> = {
      ...(filters.schoolId ? { schoolId: filters.schoolId } : {}),
      ...(filters.grade ? { grade: filters.grade } : {}),
    };

    if (req.user!.role === "professor") {
      if (!req.user!.schoolId) {
        res.status(403).json({ message: "Usuario sem escola vinculada." });
        return;
      }
      query.schoolId = req.user!.schoolId;
      const assigned = req.user!.classroomIds.filter((id) => Types.ObjectId.isValid(id));
      if (assigned.length === 0) {
        res.json([]);
        return;
      }
      query._id = { $in: assigned.map((id) => new Types.ObjectId(id)) };
    } else if (req.user!.role === "coordenador") {
      if (!req.user!.schoolId) {
        res.status(403).json({ message: "Usuario sem escola vinculada." });
        return;
      }
      query.schoolId = req.user!.schoolId;
    }

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

      const ok = await canAccessSchool(req.user!, data.schoolId);
      if (!ok) {
        res.status(403).json({ message: "Acesso negado a esta escola." });
        return;
      }

      const classroom = await ClassroomModel.create(data);
      res.status(201).json({ id: String(classroom._id) });
    } catch (error) {
      next(error);
    }
  },
);
