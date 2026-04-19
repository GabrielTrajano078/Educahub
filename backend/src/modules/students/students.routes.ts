import { Types } from "mongoose";
import { Router } from "express";
import { canAccessClassroom, canAccessSchool } from "../../lib/access";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { ClassroomModel } from "../classes/classroom.model";
import { StudentModel } from "./student.model";
import { createStudentSchema, listStudentsSchema } from "./students.schemas";

export const studentsRouter = Router();

studentsRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const filters = listStudentsSchema.parse(req.query);
    const query: Record<string, unknown> = {
      ...(filters.schoolId ? { schoolId: filters.schoolId } : {}),
      ...(filters.classroomId ? { classroomId: filters.classroomId } : {}),
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
      const inAssigned = { $in: assigned.map((id) => new Types.ObjectId(id)) };
      if (filters.classroomId) {
        if (!assigned.includes(filters.classroomId)) {
          res.json([]);
          return;
        }
        query.classroomId = filters.classroomId;
      } else {
        query.classroomId = inAssigned;
      }
    } else if (req.user!.role === "coordenador") {
      if (!req.user!.schoolId) {
        res.status(403).json({ message: "Usuario sem escola vinculada." });
        return;
      }
      query.schoolId = req.user!.schoolId;
    }

    const students = await StudentModel.find(query).sort({ fullName: 1 }).lean();
    res.json(students);
  } catch (error) {
    next(error);
  }
});

studentsRouter.post(
  "/",
  requireAuth,
  requireRole("admin", "gestor", "coordenador", "professor"),
  async (req, res, next) => {
    try {
      const data = createStudentSchema.parse(req.body);

      const ok = await canAccessSchool(req.user!, data.schoolId);
      if (!ok) {
        res.status(403).json({ message: "Acesso negado a esta escola." });
        return;
      }

      if (req.user!.role === "professor") {
        const classOk = await canAccessClassroom(req.user!, data.classroomId);
        if (!classOk) {
          res.status(403).json({ message: "Acesso negado a esta turma." });
          return;
        }
      }

      const classroom = await ClassroomModel.findById(data.classroomId).select("schoolId").lean();
      if (!classroom) {
        res.status(404).json({ message: "Turma nao encontrada." });
        return;
      }
      if (String(classroom.schoolId) !== data.schoolId) {
        res.status(400).json({ message: "A turma nao pertence a escola informada." });
        return;
      }

      const student = await StudentModel.create(data);
      res.status(201).json({ id: String(student._id) });
    } catch (error) {
      next(error);
    }
  },
);
