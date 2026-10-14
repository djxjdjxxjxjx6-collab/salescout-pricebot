import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../server/app";
import products from "../data/products.json";
import expected from "../data/expected.json";

const app = createApp();

describe("POST /reprice", () => {
  it("возвращает результаты из data/expected.json в том же порядке", async () => {
    const res = await request(app).post("/reprice").send(products);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expected);
  });

  it("пустой массив → пустой массив", async () => {
    const res = await request(app).post("/reprice").send([]);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it.each([
    ["объект", { sku: "X" }],
    ["строка", "hello"],
    ["число", 42],
    ["null", null],
  ])("тело не массив (%s) → 400", async (_label, body) => {
    const res = await request(app)
      .post("/reprice")
      .set("Content-Type", "application/json")
      .send(JSON.stringify(body));
    expect(res.status).toBe(400);
  });

  it("тело без JSON → 400", async () => {
    const res = await request(app).post("/reprice").set("Content-Type", "text/plain").send("[]");
    expect(res.status).toBe(400);
  });

  it("битый JSON → 400", async () => {
    const res = await request(app)
      .post("/reprice")
      .set("Content-Type", "application/json")
      .send("[{ broken");
    expect(res.status).toBe(400);
  });

  it("некорректный товар → 400 с описанием ошибки", async () => {
    const res = await request(app)
      .post("/reprice")
      .send([{ sku: "A", name: "A", myPrice: 1, minPrice: 10, maxPrice: 5, step: 1, competitors: [] }]);
    expect(res.status).toBe(400);
    expect(res.body.details).toContain("[0]: minPrice не может быть больше maxPrice");
  });
});
