import { Types } from "mongoose";
import { Router } from "express";
import { canAccessClassroom, canAccessSchool, canAccessStudent } from "../../lib/access";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { ClassroomModel } from "../classes/classroom.model";
import { AnswerSheetModel } from "../results/answer-sheet.model";
import { AnswerSheetScanModel } from "../results/answer-sheet-scan.model";
import { ResultModel } from "../results/result.model";
import { StudentModel } from "./student.model";
import { computeListStudentsComputation } from "./students-list-scope";
import { createStudentSchema, listStudentsSchema, updateStudentSchema } from "./students.schemas";
import { isDuplicateKeyError } from "./students.server-logic";

export const studentsRouter = Router();

studentsRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const filters = listStudentsSchema.parse(req.query);
    const user = req.user!;
    const computed = await computeListStudentsComputation(filters, user);

    if (computed.action === "json") {
      res.json(computed.body);
      return;
    }
    if (computed.action === "status_json") {
      res.status(computed.status).json(computed.body);
      return;
    }

    const students = await StudentModel.find(computed.query).sort({ fullName: 1 }).lean();
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

studentsRouter.patch(
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

      const body = updateStudentSchema.parse(req.body);
      const studentId = new Types.ObjectId(rawId);
      const existing = await StudentModel.findById(studentId).lean();
      if (!existing) {
        res.status(404).json({ message: "Aluno nao encontrado." });
        return;
      }

      let schoolId = existing.schoolId;
      let classroomId = existing.classroomId;

      if (body.classroomId) {
        const cls = await ClassroomModel.findById(body.classroomId).select("schoolId").lean();
        if (!cls) {
          res.status(400).json({ message: "Turma nao encontrada." });
          return;
        }
        const schoolOk = await canAccessSchool(req.user!, String(cls.schoolId));
        if (!schoolOk) {
          res.status(403).json({ message: "Acesso negado a esta escola." });
          return;
        }
        if (req.user!.role === "professor") {
          const classOk = await canAccessClassroom(req.user!, String(body.classroomId));
          if (!classOk) {
            res.status(403).json({ message: "Acesso negado a esta turma." });
            return;
          }
        }
        schoolId = cls.schoolId;
        classroomId = new Types.ObjectId(body.classroomId);
      }

      const nextCode = body.registrationCode ?? existing.registrationCode;
      if (nextCode !== existing.registrationCode) {
        const dup = await StudentModel.findOne({
          registrationCode: nextCode,
          _id: { $ne: studentId },
        })
          .select("_id")
          .lean();
        if (dup) {
          res.status(409).json({ message: "Ja existe aluno com este codigo de matricula." });
          return;
        }
      }

      await StudentModel.updateOne(
        { _id: studentId },
        {
          $set: {
            ...(body.fullName !== undefined ? { fullName: body.fullName } : {}),
            ...(body.registrationCode !== undefined ? { registrationCode: body.registrationCode } : {}),
            ...(body.classroomId !== undefined ? { classroomId, schoolId } : {}),
          },
        },
      );

      res.status(204).send();
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        res.status(409).json({ message: "Ja existe aluno com este codigo de matricula." });
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
