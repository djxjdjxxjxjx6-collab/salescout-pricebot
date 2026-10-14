import { useEffect, useState } from "react";
import type { PriceResult, Product, Reason } from "../../src/types";
import sampleProducts from "../../data/products.json";
import { reprice } from "./api";

interface Row extends PriceResult {
  name: string;
}

const REASON_LABELS: Record<Reason, string> = {
  UNDERCUT: "Дешевле конкурента",
  AT_MIN: "Упёрлись в минимум",
  AT_MAX: "Упёрлись в максимум",
  NO_COMPETITORS: "Нет конкурентов",
};

const SAMPLE_JSON = JSON.stringify(sampleProducts, null, 2);

const priceFormat = new Intl.NumberFormat("ru-RU");

function formatPrice(value: number): string {
  return `${priceFormat.format(value)} ₸`;
}

function formatDiff(oldPrice: number, newPrice: number): string {
  const diff = newPrice - oldPrice;
  if (diff === 0) return "0";
  return `${diff > 0 ? "+" : "−"}${priceFormat.format(Math.abs(diff))}`;
}

export function App() {
  const [input, setInput] = useState(SAMPLE_JSON);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run(json: string) {
    setLoading(true);
    setError(null);
    try {
      let products: Product[];
      try {
        products = JSON.parse(json) as Product[];
      } catch {
        throw new Error("Некорректный JSON");
      }
      const results = await reprice(products);
      // API возвращает результаты в том же порядке, поэтому название берём по индексу.
      setRows(results.map((result, i) => ({ ...result, name: products[i]?.name ?? "" })));
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void run(SAMPLE_JSON);
  }, []);

  return (
    <main className="page">
      <header>
        <h1>Прайс-бот</h1>
        <p className="muted">
          Пересчёт цен по ценам конкурентов: на шаг дешевле лучшего предложения в наличии, в
          пределах минимальной и максимальной цены.
        </p>
      </header>

      <section className="card">
        <div className="card-head">
          <h2>Было / стало</h2>
          {loading && <span className="muted">Считаем…</span>}
        </div>

        {error && <div className="error">{error}</div>}

        {rows.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Название</th>
                  <th className="num">Старая цена</th>
                  <th className="num">Новая цена</th>
                  <th className="num">Разница</th>
                  <th>Причина</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={`${row.sku}-${i}`}>
                    <td className="sku">{row.sku}</td>
                    <td>{row.name}</td>
                    <td className="num">{formatPrice(row.oldPrice)}</td>
                    <td className="num strong">{formatPrice(row.newPrice)}</td>
                    <td
                      className={`num diff ${
                        row.newPrice > row.oldPrice ? "up" : row.newPrice < row.oldPrice ? "down" : ""
                      }`}
                    >
                      {formatDiff(row.oldPrice, row.newPrice)}
                    </td>
                    <td>
                      <span className={`badge badge-${row.reason}`} title={row.reason}>
                        {REASON_LABELS[row.reason]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && rows.length === 0 && <p className="muted">Нет товаров.</p>}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Входные данные (JSON)</h2>
          <div className="actions">
            <button type="button" className="secondary" onClick={() => setInput(SAMPLE_JSON)}>
              Сбросить пример
            </button>
            <button type="button" onClick={() => void run(input)} disabled={loading}>
              Пересчитать
            </button>
          </div>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
          rows={16}
          aria-label="Товары в формате JSON"
        />
      </section>
    </main>
  );
}
