import type { Competitor, Product } from "../src/types";

export type ValidationResult =
  | { ok: true; products: Product[] }
  | { ok: false; errors: string[] };

/** Сколько ошибок максимум возвращаем клиенту, чтобы не раздувать ответ. */
const MAX_ERRORS = 20;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function validateCompetitor(value: unknown, path: string, errors: string[]): value is Competitor {
  if (!isRecord(value)) {
    errors.push(`${path}: должен быть объектом`);
    return false;
  }
  const before = errors.length;
  if (typeof value.seller !== "string") errors.push(`${path}.seller: должен быть строкой`);
  if (!isNonNegativeNumber(value.price)) errors.push(`${path}.price: должен быть числом >= 0`);
  if (typeof value.inStock !== "boolean") errors.push(`${path}.inStock: должен быть boolean`);
  return errors.length === before;
}

function validateProduct(value: unknown, path: string, errors: string[]): value is Product {
  if (!isRecord(value)) {
    errors.push(`${path}: должен быть объектом`);
    return false;
  }
  const before = errors.length;

  if (typeof value.sku !== "string" || value.sku.length === 0) {
    errors.push(`${path}.sku: должен быть непустой строкой`);
  }
  if (typeof value.name !== "string") errors.push(`${path}.name: должен быть строкой`);

  for (const field of ["myPrice", "minPrice", "maxPrice", "step"] as const) {
    if (!isNonNegativeNumber(value[field])) errors.push(`${path}.${field}: должен быть числом >= 0`);
  }
  for (const field of ["minPrice", "maxPrice"] as const) {
    const n = value[field];
    if (isNonNegativeNumber(n) && !Number.isInteger(n)) {
      errors.push(`${path}.${field}: должен быть целым числом`);
    }
  }
  if (
    isNonNegativeNumber(value.minPrice) &&
    isNonNegativeNumber(value.maxPrice) &&
    value.minPrice > value.maxPrice
  ) {
    errors.push(`${path}: minPrice не может быть больше maxPrice`);
  }

  if (!Array.isArray(value.competitors)) {
    errors.push(`${path}.competitors: должен быть массивом`);
  } else {
    value.competitors.forEach((c, i) => validateCompetitor(c, `${path}.competitors[${i}]`, errors));
  }

  return errors.length === before;
}

/** Проверяет тело запроса POST /reprice. */
export function validateProducts(body: unknown): ValidationResult {
  if (!Array.isArray(body)) {
    return { ok: false, errors: ["Тело запроса должно быть массивом товаров"] };
  }
  const errors: string[] = [];
  body.forEach((item, i) => validateProduct(item, `[${i}]`, errors));

  if (errors.length > 0) {
    return { ok: false, errors: errors.slice(0, MAX_ERRORS) };
  }
  return { ok: true, products: body as Product[] };
}
