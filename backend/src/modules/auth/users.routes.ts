import { Router } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { ClassroomModel } from "../classes/classroom.model";
import { UserModel } from "./user.model";

export const usersRouter = Router();

export const patchProfessorClassroomsSchema = z.object({
  classroomIds: z.array(z.string()),
});

usersRouter.patch(
  "/users/:userId/classrooms",
  requireAuth,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const rawUserId = req.params.userId;
      const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;
      if (!userId || !Types.ObjectId.isValid(userId)) {
        res.status(400).json({ message: "ID de usuario invalido." });
        return;
      }

      const body = patchProfessorClassroomsSchema.parse(req.body);
      const user = await UserModel.findById(userId);
      if (!user) {
        res.status(404).json({ message: "Usuario nao encontrado." });
        return;
      }

      if (user.role !== "professor") {
        res.status(400).json({ message: "Apenas perfil professor pode ter turmas atribuidas por este endpoint." });
        return;
      }

      if (!user.schoolId) {
        res.status(400).json({ message: "Professor sem escola vinculada nao pode receber turmas." });
        return;
      }

      const uniqueIds = [...new Set(body.classroomIds)];
      for (const cid of uniqueIds) {
        if (!Types.ObjectId.isValid(cid)) {
          res.status(400).json({ message: "ID de turma invalido." });
          return;
        }
      }

      if (uniqueIds.length === 0) {
        user.classroomIds = [];
        await user.save();
        res.json({ id: String(user._id), classroomIds: [] });
        return;
      }

      const objectIds = uniqueIds.map((id) => new Types.ObjectId(id));
      const classrooms = await ClassroomModel.find({ _id: { $in: objectIds } }).select("schoolId").lean();

      if (classrooms.length !== uniqueIds.length) {
        res.status(400).json({ message: "Uma ou mais turmas nao existem." });
        return;
      }

      const schoolMatches = classrooms.every((c) => String(c.schoolId) === user.schoolId);
      if (!schoolMatches) {
        res.status(400).json({ message: "Todas as turmas devem pertencer a escola do professor." });
        return;
      }

      user.classroomIds = objectIds;
      await user.save();
      res.json({ id: String(user._id), classroomIds: uniqueIds });
    } catch (error) {
      next(error);
    }
  },
);
