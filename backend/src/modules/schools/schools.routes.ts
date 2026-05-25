import { Router } from "express";
import { Types } from "mongoose";
import { escapeRegex } from "../../lib/escape-regex";
import { normalizeSchoolName } from "../../lib/normalize-school-name";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { SchoolModel } from "./school.model";
import { ClassroomModel } from "../classes/classroom.model";
import { createSchoolSchema, listSchoolsSchema, schoolIdParamsSchema, updateSchoolSchema } from "./schools.schemas";
import { serializeSchool } from "./school-serialize";

export const schoolsRouter = Router();

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === 11000
  );
}

schoolsRouter.get("/", requireAuth, requireRole("admin", "gestor"), async (req, res, next) => {
  try {
    const filters = listSchoolsSchema.parse(req.query);
    const nameTrim = filters.nameContains?.trim();
    const normalizedQuery = nameTrim ? normalizeSchoolName(nameTrim) : undefined;

    const query: Record<string, unknown> = {
      ...(normalizedQuery
        ? { normalizedName: { $regex: escapeRegex(normalizedQuery), $options: "i" } }
        : {}),
    };

    if (req.user!.role === "gestor") {
      if (!req.user!.municipalityCode) {
        res.status(403).json({ message: "Gestor sem municipio vinculado." });
        return;
      }
      query.municipalityCode = req.user!.municipalityCode;
    }

    const schools = await SchoolModel.find(query).sort({ normalizedName: 1 }).lean();
    res.json(schools.map(serializeSchool));
  } catch (error) {
    next(error);
  }
});

schoolsRouter.post("/", requireAuth, requireRole("admin", "gestor"), async (req, res, next) => {
  try {
    const data = createSchoolSchema.parse(req.body);

    if (req.user!.role === "gestor") {
      if (!req.user!.municipalityCode) {
        res.status(403).json({ message: "Gestor sem municipio vinculado." });
        return;
      }
      if (data.municipalityCode && data.municipalityCode !== req.user!.municipalityCode) {
        res.status(403).json({ message: "Municipio divergente do perfil." });
        return;
      }
    }

    const municipalityCode =
      req.user!.role === "gestor" && !data.municipalityCode
        ? req.user!.municipalityCode
        : data.municipalityCode;

    try {
      const school = await SchoolModel.create({
        ...data,
        normalizedName: normalizeSchoolName(data.name),
        ...(municipalityCode ? { municipalityCode } : {}),
      });
      res.status(201).json({ id: String(school._id) });
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        res.status(409).json({ message: "Já existe uma escola com este nome no município." });
        return;
      }
      throw err;
    }
  } catch (error) {
    next(error);
  }
});

schoolsRouter.get("/:id", requireAuth, requireRole("admin", "gestor"), async (req, res, next) => {
  try {
    const { id } = schoolIdParamsSchema.parse(req.params);
    const school = await SchoolModel.findById(id).lean();
    if (!school) {
      res.status(404).json({ message: "Escola nao encontrada." });
      return;
    }
    if (req.user!.role === "gestor") {
      if (!req.user!.municipalityCode || school.municipalityCode !== req.user!.municipalityCode) {
        res.status(403).json({ message: "Acesso negado a esta escola." });
        return;
      }
    }
    res.json(serializeSchool(school));
  } catch (error) {
    next(error);
  }
});

schoolsRouter.patch("/:id", requireAuth, requireRole("admin", "gestor"), async (req, res, next) => {
  try {
    const { id } = schoolIdParamsSchema.parse(req.params);
    const data = updateSchoolSchema.parse(req.body);
    const existing = await SchoolModel.findById(id).lean();
    if (!existing) {
      res.status(404).json({ message: "Escola nao encontrada." });
      return;
    }

    if (req.user!.role === "gestor") {
      if (!req.user!.municipalityCode || existing.municipalityCode !== req.user!.municipalityCode) {
        res.status(403).json({ message: "Acesso negado a esta escola." });
        return;
      }
      if (data.municipalityCode && data.municipalityCode !== req.user!.municipalityCode) {
        res.status(403).json({ message: "Municipio divergente do perfil." });
        return;
      }
    }

    const $set: Record<string, unknown> = {};
    if (data.name !== undefined) {
      $set.name = data.name;
      $set.normalizedName = normalizeSchoolName(data.name);
    }
    if (data.city !== undefined) $set.city = data.city;
    if (data.municipalityCode !== undefined) $set.municipalityCode = data.municipalityCode;

    try {
      await SchoolModel.updateOne({ _id: id }, { $set });
      res.status(204).send();
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        res.status(409).json({ message: "Já existe uma escola com este nome no município." });
        return;
      }
      throw err;
    }
  } catch (error) {
    next(error);
  }
});

schoolsRouter.delete("/:id", requireAuth, requireRole("admin", "gestor"), async (req, res, next) => {
  try {
    const { id } = schoolIdParamsSchema.parse(req.params);
    const school = await SchoolModel.findById(id).lean();
    if (!school) {
      res.status(404).json({ message: "Escola nao encontrada." });
      return;
    }
    if (req.user!.role === "gestor") {
      if (!req.user!.municipalityCode || school.municipalityCode !== req.user!.municipalityCode) {
        res.status(403).json({ message: "Acesso negado a esta escola." });
        return;
      }
    }

    const hasClasses = await ClassroomModel.exists({ schoolId: new Types.ObjectId(id) });
    if (hasClasses) {
      res.status(409).json({ message: "Escola com turmas vinculadas. Remova as turmas antes de excluir." });
      return;
    }

    await SchoolModel.deleteOne({ _id: id });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
