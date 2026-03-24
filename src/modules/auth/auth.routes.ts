import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { UserModel } from "./user.model";
import { bootstrapAdminSchema, loginSchema } from "./auth.schemas";

export const authRouter = Router();

authRouter.post("/bootstrap-admin", async (req, res, next) => {
  try {
    const data = bootstrapAdminSchema.parse(req.body);
    const hasAnyUser = await UserModel.exists({});

    if (hasAnyUser) {
      res.status(409).json({ message: "Bootstrap indisponivel: usuarios ja existem." });
      return;
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await UserModel.create({
      fullName: data.fullName,
      email: data.email,
      passwordHash,
      role: "admin",
      schoolId: null,
    });

    res.status(201).json({ id: String(user._id) });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await UserModel.findOne({ email: data.email }).lean();
    if (!user) {
      res.status(401).json({ message: "Credenciais invalidas." });
      return;
    }

    const passwordOk = await bcrypt.compare(data.password, user.passwordHash);

    if (!passwordOk) {
      res.status(401).json({ message: "Credenciais invalidas." });
      return;
    }

    const token = jwt.sign(
      { id: String(user._id), role: user.role, schoolId: user.schoolId },
      env.JWT_SECRET,
      { expiresIn: "8h" },
    );

    res.json({ token });
  } catch (error) {
    next(error);
  }
});
