import { Router } from "express";
import { RegisterInput, LoginInput } from "@marketplace/schemas";
import {
  registerUser,
  loginUser,
  AgeRestrictionError,
  DuplicateUserError,
  InvalidCredentialsError,
} from "./auth.service.js";
import { logger } from "../../lib/logger.js";

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const parsed = RegisterInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
  }

  try {
    const user = await registerUser(parsed.data);
    return res.status(201).json({ id: user.id, ucid: user.ucid });
  } catch (err) {
    if (err instanceof AgeRestrictionError) {
      return res.status(403).json({ error: "AGE_RESTRICTED", message: err.message });
    }
    if (err instanceof DuplicateUserError) {
      return res.status(409).json({ error: "DUPLICATE_USER", message: err.message });
    }
    logger.error({ err }, "Unexpected error during registration");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

authRouter.post("/login", async (req, res) => {
  const parsed = LoginInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
  }

  try {
    const result = await loginUser(parsed.data);
    return res.json(result);
  } catch (err) {
    if (err instanceof InvalidCredentialsError) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    }
    logger.error({ err }, "Unexpected error during login");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});
