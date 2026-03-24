import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { StudentModel } from "./student.model";
import { createStudentSchema, listStudentsSchema } from "./students.schemas";

export const studentsRouter = Router();

studentsRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const filters = listStudentsSchema.parse(req.query);
    const query = {
      ...(filters.schoolId ? { schoolId: filters.schoolId } : {}),
      ...(filters.classroomId ? { classroomId: filters.classroomId } : {}),
    };

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
      const student = await StudentModel.create(data);
      res.status(201).json({ id: String(student._id) });
    } catch (error) {
      next(error);
    }
  },
);
