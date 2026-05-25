import { Router } from "express";
import { Types } from "mongoose";
import { escapeRegex } from "../../lib/escape-regex";
import { normalizeSchoolName } from "../../lib/normalize-school-name";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { SchoolModel } from "./school.model";
import { ClassroomModel } from "../classes/classroom.model";
import { createSchoolSchema, listSchoolsSchema, schoolIdParamsSchema, updateSchoolSchema } from "./schools.schemas";

export const schoolsRouter = Router();

function isDuplicateKeyError(error: unknown): error is { code: number } {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: number }).code === 11000);
}

function trimmedName(name: string): string {
  return name.trim();
}

schoolsRouter.get("/", requireAuth, requireRole("admin", "gestor"), async (req, res, next) => {
  try {
    const filters = listSchoolsSchema.parse(req.query);
    const nameTrim = filters.nameContains?.trim();
    const query: Record<string, unknown> = {
      ...(nameTrim
        ? {
            normalizedName: { $regex: escapeRegex(normalizeSchoolName(nameTrim)), $options: "i" },
          }
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
    res.json(schools);
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

    const name = trimmedName(data.name);
    const school = await SchoolModel.create({
      name,
      normalizedName: normalizeSchoolName(name),
      ...(data.city !== undefined ? { city: data.city } : {}),
      ...(req.user!.role === "gestor" && !data.municipalityCode
        ? { municipalityCode: req.user!.municipalityCode }
        : data.municipalityCode !== undefined
          ? { municipalityCode: data.municipalityCode }
          : {}),
    });
    res.status(201).json({ id: String(school._id) });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      res.status(409).json({ message: "Ja existe escola com este nome no municipio informado." });
      return;
    }
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
    res.json(school);
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

    const $set: Record<string, unknown> = {
      ...(data.city !== undefined ? { city: data.city } : {}),
      ...(data.municipalityCode !== undefined ? { municipalityCode: data.municipalityCode } : {}),
    };
    if (data.name !== undefined) {
      const name = trimmedName(data.name);
      $set.name = name;
      $set.normalizedName = normalizeSchoolName(name);
    }

    await SchoolModel.updateOne({ _id: id }, { $set });
    res.status(204).send();
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      res.status(409).json({ message: "Ja existe escola com este nome no municipio informado." });
      return;
    }
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
