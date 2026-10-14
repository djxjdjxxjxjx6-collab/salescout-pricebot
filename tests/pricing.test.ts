import { describe, expect, it } from "vitest";
import { calculatePrice, findBestCompetitorPrice, floorSafe } from "../src/pricing";
import type { Competitor, PriceResult, Product } from "../src/types";
import products from "../data/products.json";
import expected from "../data/expected.json";

/** Собирает товар с разумными значениями по умолчанию, чтобы тесты были короткими. */
function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    sku: "TEST-SKU",
    name: "Тестовый товар",
    myPrice: 100_000,
    minPrice: 90_000,
    maxPrice: 120_000,
    step: 10,
    competitors: [],
    ...overrides,
  };
}

function inStock(price: number, seller = "Seller"): Competitor {
  return { seller, price, inStock: true };
}

function outOfStock(price: number, seller = "Seller"): Competitor {
  return { seller, price, inStock: false };
}

describe("calculatePrice: данные из data/", () => {
  it("совпадает с data/expected.json", () => {
    const results = (products as Product[]).map(calculatePrice);
    expect(results).toEqual(expected as PriceResult[]);
  });
});

describe("calculatePrice: примеры из README", () => {
  it.each([
    { best: 384990, step: 10, min: 370000, max: 420000, newPrice: 384980, reason: "UNDERCUT" },
    { best: 175000, step: 100, min: 180000, max: 210000, newPrice: 180000, reason: "AT_MIN" },
    { best: 150000, step: 1, min: 100000, max: 125000, newPrice: 125000, reason: "AT_MAX" },
    { best: 349999.9, step: 0.5, min: 330000, max: 380000, newPrice: 349999, reason: "UNDERCUT" },
  ])("best=$best step=$step → $newPrice ($reason)", ({ best, step, min, max, newPrice, reason }) => {
    const result = calculatePrice(
      makeProduct({ minPrice: min, maxPrice: max, step, competitors: [inStock(best)] }),
    );
    expect(result.newPrice).toBe(newPrice);
    expect(result.reason).toBe(reason);
  });
});

describe("calculatePrice: NO_COMPETITORS", () => {
  it("пустой список конкурентов → maxPrice", () => {
    const result = calculatePrice(makeProduct({ competitors: [] }));
    expect(result).toEqual({
      sku: "TEST-SKU",
      oldPrice: 100_000,
      newPrice: 120_000,
      reason: "NO_COMPETITORS",
    });
  });

  it("все конкуренты не в наличии → maxPrice", () => {
    const result = calculatePrice(
      makeProduct({ competitors: [outOfStock(50_000), outOfStock(95_000)] }),
    );
    expect(result.newPrice).toBe(120_000);
    expect(result.reason).toBe("NO_COMPETITORS");
  });
});

describe("calculatePrice: выбор лучшей цены", () => {
  it("игнорирует более дешёвых конкурентов не в наличии", () => {
    const result = calculatePrice(
      makeProduct({ competitors: [outOfStock(91_000), inStock(100_000)] }),
    );
    expect(result.newPrice).toBe(99_990);
    expect(result.reason).toBe("UNDERCUT");
  });

  it("берёт минимальную цену независимо от порядка конкурентов", () => {
    const result = calculatePrice(
      makeProduct({ competitors: [inStock(110_000), inStock(100_000), inStock(105_000)] }),
    );
    expect(result.newPrice).toBe(99_990);
  });

  it("несколько конкурентов с одинаковой минимальной ценой", () => {
    const result = calculatePrice(
      makeProduct({ competitors: [inStock(100_000, "A"), inStock(100_000, "B")] }),
    );
    expect(result.newPrice).toBe(99_990);
    expect(result.reason).toBe("UNDERCUT");
  });
});

describe("calculatePrice: границы диапазона", () => {
  it("candidate ровно minPrice → UNDERCUT (граница включительно)", () => {
    const result = calculatePrice(makeProduct({ step: 10, competitors: [inStock(90_010)] }));
    expect(result).toMatchObject({ newPrice: 90_000, reason: "UNDERCUT" });
  });

  it("candidate ровно maxPrice → UNDERCUT (граница включительно)", () => {
    const result = calculatePrice(makeProduct({ step: 10, competitors: [inStock(120_010)] }));
    expect(result).toMatchObject({ newPrice: 120_000, reason: "UNDERCUT" });
  });

  it("candidate на 1 ниже minPrice → AT_MIN", () => {
    const result = calculatePrice(makeProduct({ step: 10, competitors: [inStock(90_009)] }));
    expect(result).toMatchObject({ newPrice: 90_000, reason: "AT_MIN" });
  });

  it("candidate на 1 выше maxPrice → AT_MAX", () => {
    const result = calculatePrice(makeProduct({ step: 10, competitors: [inStock(120_011)] }));
    expect(result).toMatchObject({ newPrice: 120_000, reason: "AT_MAX" });
  });

  it("minPrice === maxPrice", () => {
    const fixed = { minPrice: 100_000, maxPrice: 100_000 };
    expect(calculatePrice(makeProduct({ ...fixed, competitors: [inStock(100_010)] }))).toMatchObject(
      { newPrice: 100_000, reason: "UNDERCUT" },
    );
    expect(calculatePrice(makeProduct({ ...fixed, competitors: [inStock(50_000)] }))).toMatchObject(
      { newPrice: 100_000, reason: "AT_MIN" },
    );
    expect(calculatePrice(makeProduct({ ...fixed, competitors: [inStock(200_000)] }))).toMatchObject(
      { newPrice: 100_000, reason: "AT_MAX" },
    );
  });

  it("минимальная цена 0: конкурент дешевле шага → AT_MIN с ценой 0", () => {
    const result = calculatePrice(
      makeProduct({ minPrice: 0, maxPrice: 100, step: 10, competitors: [inStock(5)] }),
    );
    expect(result).toMatchObject({ newPrice: 0, reason: "AT_MIN" });
  });
});

describe("calculatePrice: шаг и округление", () => {
  it("step = 0 → цена равна цене конкурента", () => {
    const result = calculatePrice(makeProduct({ step: 0, competitors: [inStock(100_000)] }));
    expect(result).toMatchObject({ newPrice: 100_000, reason: "UNDERCUT" });
  });

  it("step = 0 и дробная цена конкурента → округление вниз", () => {
    const result = calculatePrice(makeProduct({ step: 0, competitors: [inStock(100_000.99)] }));
    expect(result.newPrice).toBe(100_000);
  });

  it("дробный шаг округляет вниз, а не к ближайшему", () => {
    const result = calculatePrice(makeProduct({ step: 0.1, competitors: [inStock(100_000)] }));
    expect(result.newPrice).toBe(99_999);
  });

  it("не ломается на ошибках плавающей точки (100.3 - 0.3 = 100)", () => {
    const result = calculatePrice(
      makeProduct({ minPrice: 0, maxPrice: 1_000, step: 0.3, competitors: [inStock(100.3)] }),
    );
    expect(result.newPrice).toBe(100);
  });

  it("результат всегда целое число", () => {
    const result = calculatePrice(makeProduct({ step: 0.7, competitors: [inStock(99_999.95)] }));
    expect(Number.isInteger(result.newPrice)).toBe(true);
  });
});

describe("calculatePrice: прочее", () => {
  it("myPrice не влияет на расчёт и возвращается как oldPrice", () => {
    const competitors = [inStock(100_000)];
    const cheap = calculatePrice(makeProduct({ myPrice: 1, competitors }));
    const expensive = calculatePrice(makeProduct({ myPrice: 999_999, competitors }));
    expect(cheap.newPrice).toBe(expensive.newPrice);
    expect(cheap.oldPrice).toBe(1);
    expect(expensive.oldPrice).toBe(999_999);
  });

  it("возвращает только поля PriceResult", () => {
    const result = calculatePrice(makeProduct({ competitors: [inStock(100_000)] }));
    expect(Object.keys(result).sort()).toEqual(["newPrice", "oldPrice", "reason", "sku"]);
  });

  it("не изменяет входной объект", () => {
    const product = makeProduct({ competitors: [inStock(100_000), outOfStock(1)] });
    const snapshot = structuredClone(product);
    calculatePrice(product);
    expect(product).toEqual(snapshot);
  });
});

describe("вспомогательные функции", () => {
  it("findBestCompetitorPrice возвращает null без конкурентов в наличии", () => {
    expect(findBestCompetitorPrice([])).toBeNull();
    expect(findBestCompetitorPrice([outOfStock(1)])).toBeNull();
  });

  it("floorSafe", () => {
    expect(floorSafe(10.9)).toBe(10);
    expect(floorSafe(10)).toBe(10);
    expect(floorSafe(99.99999999999999)).toBe(100);
    expect(floorSafe(99.5)).toBe(99);
  });
});
