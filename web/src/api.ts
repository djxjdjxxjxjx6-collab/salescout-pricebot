import type { PriceResult, Product } from "../../src/types";

interface ApiError {
  error?: string;
  details?: string[];
}

/** Отправляет товары на POST /reprice и возвращает результаты в том же порядке. */
export async function reprice(products: Product[]): Promise<PriceResult[]> {
  const response = await fetch("/reprice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(products),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiError;
    const details = body.details?.length ? `: ${body.details.join("; ")}` : "";
    throw new Error(`${body.error ?? `Ошибка ${response.status}`}${details}`);
  }

  return (await response.json()) as PriceResult[];
}
