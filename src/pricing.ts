import type { Competitor, Product, PriceResult } from "./types";

/**
 * Погрешность для сравнения дробных чисел.
 * Нужна, чтобы `floor` не «проваливался» на артефактах плавающей точки:
 * например, 100.3 - 0.3 в JS даёт 99.99999999999999, а должно быть 100.
 */
const EPSILON = 1e-9;

/** Округление вниз до целого с защитой от ошибок плавающей точки. */
export function floorSafe(value: number): number {
  const nearest = Math.round(value);
  if (Math.abs(value - nearest) < EPSILON * Math.max(1, Math.abs(value))) {
    return nearest;
  }
  return Math.floor(value);
}

/** Минимальная цена среди конкурентов в наличии или null, если таких нет. */
export function findBestCompetitorPrice(competitors: Competitor[]): number | null {
  let best: number | null = null;
  for (const competitor of competitors) {
    if (!competitor.inStock) continue;
    if (best === null || competitor.price < best) {
      best = competitor.price;
    }
  }
  return best;
}

/**
 * Чистая функция: рассчитывает новую цену для одного товара.
 * Правила — см. README, раздел «Правила расчёта цены».
 * Не меняйте сигнатуру и путь к файлу: решение проверяется автотестами.
 */
export function calculatePrice(product: Product): PriceResult {
  const { sku, myPrice, minPrice, maxPrice, step, competitors } = product;
  const base = { sku, oldPrice: myPrice };

  const best = findBestCompetitorPrice(competitors);
  if (best === null) {
    return { ...base, newPrice: maxPrice, reason: "NO_COMPETITORS" };
  }

  const candidate = floorSafe(best - step);

  if (candidate < minPrice) {
    return { ...base, newPrice: minPrice, reason: "AT_MIN" };
  }
  if (candidate > maxPrice) {
    return { ...base, newPrice: maxPrice, reason: "AT_MAX" };
  }
  return { ...base, newPrice: candidate, reason: "UNDERCUT" };
}
