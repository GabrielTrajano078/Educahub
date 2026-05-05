import { Router } from "express";
import { escapeRegex } from "../../lib/escape-regex";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { SchoolModel } from "./school.model";
import { createSchoolSchema, listSchoolsSchema } from "./schools.schemas";

export const schoolsRouter = Router();

schoolsRouter.get("/", requireAuth, requireRole("admin", "gestor"), async (req, res, next) => {
  try {
    const filters = listSchoolsSchema.parse(req.query);
    const nameTrim = filters.nameContains?.trim();
    const query: Record<string, unknown> = {
      ...(nameTrim
        ? {
            name: { $regex: escapeRegex(nameTrim), $options: "i" },
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

    const schools = await SchoolModel.find(query).sort({ name: 1 }).lean();
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

    const school = await SchoolModel.create({
      ...data,
      ...(req.user!.role === "gestor" && !data.municipalityCode
        ? { municipalityCode: req.user!.municipalityCode }
        : {}),
    });
    res.status(201).json({ id: String(school._id) });
  } catch (error) {
    next(error);
  }
});
