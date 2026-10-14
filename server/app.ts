import express, { type ErrorRequestHandler, type Express } from "express";
import { calculatePrice } from "../src/pricing";
import type { PriceResult } from "../src/types";
import { validateProducts } from "./validation";

/** Создаёт Express-приложение без запуска сервера (удобно для тестов). */
export function createApp(): Express {
  const app = express();

  app.use(express.json({ limit: "5mb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/reprice", (req, res) => {
    const validation = validateProducts(req.body);
    if (!validation.ok) {
      res.status(400).json({ error: "Bad Request", details: validation.errors });
      return;
    }
    const results: PriceResult[] = validation.products.map(calculatePrice);
    res.json(results);
  });

  // Некорректный JSON или слишком большое тело: express.json() бросает ошибку со статусом.
  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    const status =
      typeof err === "object" && err !== null && "status" in err && typeof err.status === "number"
        ? err.status
        : 500;
    if (status >= 500) console.error(err);
    res
      .status(status)
      .json({ error: status >= 500 ? "Internal Server Error" : "Invalid request body" });
  };
  app.use(errorHandler);

  return app;
}
