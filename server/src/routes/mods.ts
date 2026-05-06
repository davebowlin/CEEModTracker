import { Router } from "express";
import { readDatabase } from "../services/database.js";

export const modsRouter = Router();

modsRouter.get("/", async (_req, res, next) => {
  try {
    const db = await readDatabase();
    res.json(db);
  } catch (error) {
    next(error);
  }
});
