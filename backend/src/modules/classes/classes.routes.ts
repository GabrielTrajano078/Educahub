import { Types } from "mongoose";
import { Router } from "express";
import { escapeRegex } from "../../lib/escape-regex";
import { canAccessSchool } from "../../lib/access";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { ClassroomModel } from "./classroom.model";
import { classroomIdParamsSchema, createClassroomSchema, listClassroomsSchema, updateClassroomSchema } from "./classes.schemas";
import { StudentModel } from "../students/student.model";

export const classesRouter = Router();

function isDuplicateKeyError(error: unknown): error is { code: number } {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: number }).code === 11000);
}

classesRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const filters = listClassroomsSchema.parse(req.query);
    const nameTrim = filters.nameContains?.trim();
    const query: Record<string, unknown> = {
      ...(filters.schoolId ? { schoolId: filters.schoolId } : {}),
      ...(filters.grade ? { grade: filters.grade } : {}),
      ...(nameTrim
        ? {
            name: { $regex: escapeRegex(nameTrim), $options: "i" },
          }
        : {}),
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
      if (isDuplicateKeyError(error)) {
        res.status(409).json({ message: "Já existe turma com este nome para a escola informada." });
        return;
      }
      next(error);
    }
  },
);

classesRouter.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = classroomIdParamsSchema.parse(req.params);
    const classroom = await ClassroomModel.findById(id).lean();
    if (!classroom) {
      res.status(404).json({ message: "Turma nao encontrada." });
      return;
    }
    const ok = await canAccessSchool(req.user!, String(classroom.schoolId));
    if (!ok) {
      res.status(403).json({ message: "Acesso negado a esta turma." });
      return;
    }
    res.json(classroom);
  } catch (error) {
    next(error);
  }
});

classesRouter.patch(
  "/:id",
  requireAuth,
  requireRole("admin", "gestor", "coordenador"),
  async (req, res, next) => {
    try {
      const { id } = classroomIdParamsSchema.parse(req.params);
      const data = updateClassroomSchema.parse(req.body);

      const existing = await ClassroomModel.findById(id).lean();
      if (!existing) {
        res.status(404).json({ message: "Turma nao encontrada." });
        return;
      }

      const targetSchoolId = data.schoolId ?? String(existing.schoolId);
      const ok = await canAccessSchool(req.user!, targetSchoolId);
      if (!ok) {
        res.status(403).json({ message: "Acesso negado a esta escola." });
        return;
      }

      await ClassroomModel.updateOne(
        { _id: id },
        {
          $set: {
            ...(data.schoolId !== undefined ? { schoolId: data.schoolId } : {}),
            ...(data.name !== undefined ? { name: data.name } : {}),
            ...(data.grade !== undefined ? { grade: data.grade } : {}),
          },
        },
      );

      res.status(204).send();
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        res.status(409).json({ message: "Já existe turma com este nome para a escola informada." });
        return;
      }
      next(error);
    }
  },
);

classesRouter.delete("/:id", requireAuth, requireRole("admin", "gestor", "coordenador"), async (req, res, next) => {
  try {
    const { id } = classroomIdParamsSchema.parse(req.params);
    const existing = await ClassroomModel.findById(id).lean();
    if (!existing) {
      res.status(404).json({ message: "Turma nao encontrada." });
      return;
    }

    const ok = await canAccessSchool(req.user!, String(existing.schoolId));
    if (!ok) {
      res.status(403).json({ message: "Acesso negado a esta escola." });
      return;
    }

    const hasStudents = await StudentModel.exists({ classroomId: id });
    if (hasStudents) {
      res.status(409).json({ message: "Turma com alunos vinculados. Remova os alunos antes de excluir." });
      return;
    }

    await ClassroomModel.deleteOne({ _id: id });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
