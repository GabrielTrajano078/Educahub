import { Types } from "mongoose";
import { Router } from "express";
import type { AuthUser } from "../../types/auth";
import { escapeRegex } from "../../lib/escape-regex";
import { canAccessClassroom, canAccessSchool, canAccessStudent } from "../../lib/access";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { ClassroomModel } from "../classes/classroom.model";
import { AnswerSheetModel } from "../results/answer-sheet.model";
import { AnswerSheetScanModel } from "../results/answer-sheet-scan.model";
import { ResultModel } from "../results/result.model";
import { StudentModel } from "./student.model";
import { createStudentSchema, listStudentsSchema } from "./students.schemas";

export const studentsRouter = Router();

function isDuplicateKeyError(error: unknown): error is { code: number } {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: number }).code === 11000);
}

async function classroomIdsForGrade(
  grade: "5" | "9",
  filtersSchoolId: string | undefined,
  user: AuthUser,
): Promise<Types.ObjectId[]> {
  const cq: Record<string, unknown> = { grade };
  if (filtersSchoolId) {
    cq.schoolId = filtersSchoolId;
  } else if (user.role === "coordenador" || user.role === "professor") {
    if (!user.schoolId || !Types.ObjectId.isValid(user.schoolId)) {
      return [];
    }
    cq.schoolId = user.schoolId;
  }
  const cls = await ClassroomModel.find(cq).select("_id").lean();
  return cls.map((c) => c._id as Types.ObjectId);
}

studentsRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const filters = listStudentsSchema.parse(req.query);
    const nameTrim = filters.fullNameContains?.trim();
    const user = req.user!;

    let gradeClassroomIds: Types.ObjectId[] | undefined;
    const useGradeFilter = Boolean(filters.grade && !filters.classroomId);
    if (useGradeFilter && filters.grade) {
      gradeClassroomIds = await classroomIdsForGrade(filters.grade, filters.schoolId, user);
      if (gradeClassroomIds.length === 0) {
        res.json([]);
        return;
      }
    }

    const query: Record<string, unknown> = {};
    if (nameTrim) {
      query.fullName = { $regex: escapeRegex(nameTrim), $options: "i" };
    }

    if (filters.classroomId) {
      query.classroomId = new Types.ObjectId(filters.classroomId);
    }

    if (user.role === "professor") {
      if (!user.schoolId) {
        res.status(403).json({ message: "Usuario sem escola vinculada." });
        return;
      }
      query.schoolId = user.schoolId;
      const assigned = user.classroomIds.filter((id) => Types.ObjectId.isValid(id));
      if (assigned.length === 0) {
        res.json([]);
        return;
      }
      const assignedOid = assigned.map((id) => new Types.ObjectId(id));
      if (filters.classroomId) {
        if (!assigned.includes(filters.classroomId)) {
          res.json([]);
          return;
        }
      } else if (gradeClassroomIds) {
        const allowed = new Set(gradeClassroomIds.map((id) => String(id)));
        const pool = assignedOid.filter((id) => allowed.has(String(id)));
        if (pool.length === 0) {
          res.json([]);
          return;
        }
        query.classroomId = { $in: pool };
      } else {
        query.classroomId = { $in: assignedOid };
      }
    } else if (user.role === "coordenador") {
      if (!user.schoolId) {
        res.status(403).json({ message: "Usuario sem escola vinculada." });
        return;
      }
      query.schoolId = user.schoolId;
      if (!filters.classroomId && gradeClassroomIds) {
        query.classroomId = { $in: gradeClassroomIds };
      }
    } else {
      if (filters.schoolId) {
        query.schoolId = filters.schoolId;
      }
      if (!filters.classroomId && gradeClassroomIds) {
        query.classroomId = { $in: gradeClassroomIds };
      }
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
      if (isDuplicateKeyError(error)) {
        res.status(409).json({ message: "Já existe aluno com este código de matrícula." });
        return;
      }
      next(error);
    }
  },
);

studentsRouter.delete(
  "/:id",
  requireAuth,
  requireRole("admin", "gestor", "coordenador", "professor"),
  async (req, res, next) => {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!rawId || !Types.ObjectId.isValid(rawId)) {
        res.status(400).json({ message: "ID invalido." });
        return;
      }

      const allowed = await canAccessStudent(req.user!, rawId);
      if (!allowed) {
        res.status(403).json({ message: "Acesso negado a este aluno." });
        return;
      }

      const existing = await StudentModel.findById(rawId).select("_id").lean();
      if (!existing) {
        res.status(404).json({ message: "Aluno nao encontrado." });
        return;
      }

      const studentId = new Types.ObjectId(rawId);
      await ResultModel.deleteMany({ studentId });
      await AnswerSheetScanModel.deleteMany({ studentId });
      await AnswerSheetModel.deleteMany({ studentId });
      await StudentModel.deleteOne({ _id: studentId });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);
