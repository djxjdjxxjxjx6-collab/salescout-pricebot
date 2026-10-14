# SaleScout — мини прайс-бот

Тестовое задание SaleScout (стажёр, web-разработчик): мини-версия прайс-бота для Kaspi.kz.
Бот смотрит на цены конкурентов в наличии и выставляет цену на шаг дешевле лучшей,
не выходя за границы `minPrice` / `maxPrice`.

- `src/pricing.ts` — функция `calculatePrice(product)` (чистая, без I/O)
- `server/` — HTTP API на **Express**: `POST /reprice`
- `web/` — страница на **React + Vite**: таблица «было / стало»
- `tests/` — тесты на **Vitest** (функция расчёта + API через supertest)

## Быстрый старт

Нужен **Node.js 20+** и npm.

```bash
npm install
```

Сервер и фронтенд запускаются в двух терминалах:

```bash
# Терминал 1 — API на http://localhost:3000
npm run dev:server

# Терминал 2 — страница на http://localhost:5173
npm run dev:web
```

Откройте http://localhost:5173. Страница сразу отправляет пример из `data/products.json`
на `POST /reprice` и показывает результат. JSON можно отредактировать и нажать «Пересчитать».
Vite проксирует запросы `/reprice` на `http://localhost:3000`
(другой адрес API можно задать переменной `API_URL`).

### Все команды

| Команда | Что делает |
|---|---|
| `npm test` | запустить все тесты один раз |
| `npm run test:watch` | тесты в watch-режиме |
| `npm run typecheck` | проверка типов TypeScript |
| `npm run dev:server` | API с автоперезапуском при изменениях |
| `npm run server` | API без watch-режима |
| `npm run dev:web` | фронтенд (Vite dev server) |
| `npm run build:web` | сборка фронтенда в `dist/` |

Порт API меняется переменной окружения `PORT` (по умолчанию `3000`).

## API

### `POST /reprice`

Тело — массив товаров (`Product[]`, см. `src/types.ts`). Ответ `200` — массив `PriceResult[]`
в том же порядке.

```bash
curl -X POST http://localhost:3000/reprice \
  -H "Content-Type: application/json" \
  -d @data/products.json
```

```json
[
  { "sku": "IPH15-128-BLK", "oldPrice": 389990, "newPrice": 384980, "reason": "UNDERCUT" },
  { "sku": "SAM-A55-256", "oldPrice": 189000, "newPrice": 180000, "reason": "AT_MIN" }
]
```

Ошибки — `400` с описанием:

- тело не массив, не JSON или битый JSON;
- у товара неверные поля: пустой `sku`, отрицательные или нечисловые цены,
  дробные `minPrice` / `maxPrice`, `minPrice > maxPrice`, некорректные конкуренты.

```json
{ "error": "Bad Request", "details": ["[0]: minPrice не может быть больше maxPrice"] }
```

Также есть `GET /health` → `{ "status": "ok" }`.

## Как считается цена

1. Берутся только конкуренты с `inStock: true`.
2. Если таких нет → `newPrice = maxPrice`, причина `NO_COMPETITORS`.
3. Иначе `best` — минимальная цена среди них, `candidate = floor(best - step)`.
4. `candidate < minPrice` → `minPrice` (`AT_MIN`); `candidate > maxPrice` → `maxPrice` (`AT_MAX`);
   иначе `candidate` (`UNDERCUT`). Границы включительно.
5. `myPrice` на расчёт не влияет и возвращается как `oldPrice`.

### Решения, о которых стоит сказать

- **Округление с учётом плавающей точки.** В JS `100.3 - 0.3 = 99.99999999999999`, и обычный
  `Math.floor` дал бы `99` вместо `100`. Поэтому `floorSafe` сначала проверяет, не находится ли
  число в пределах крошечной погрешности от целого, и только потом округляет вниз.
- **Поиск минимума одним проходом** без промежуточных массивов (`filter` + `Math.min(...)`):
  `Math.min(...arr)` на очень длинных списках может упасть с переполнением стека.
- **`calculatePrice` не валидирует вход** (по условию), а эндпоинт валидирует: функция остаётся
  чистой и быстрой, а некорректные данные отсекаются на границе системы.
- **`createApp()` отделён от `listen()`**, чтобы тестировать API через supertest без запуска
  реального сервера.

## Тесты

```bash
npm test
```

- `tests/pricing.test.ts` — примеры из условия, сверка с `data/expected.json`,
  фильтрация по наличию, одинаковые минимальные цены, границы диапазона включительно,
  `minPrice === maxPrice`, `step = 0`, дробные шаги и цены, ошибки плавающей точки,
  независимость от `myPrice`, неизменность входных данных.
- `tests/api.test.ts` — `200` для примера и пустого массива, `400` для не-массива,
  не-JSON, битого JSON и некорректного товара.

## Структура

```
├── data/              пример входных данных и ожидаемый результат
├── server/
│   ├── app.ts         Express-приложение (createApp)
│   ├── index.ts       запуск сервера
│   └── validation.ts  проверка тела запроса
├── src/
│   ├── pricing.ts     calculatePrice — основная логика
│   └── types.ts       общие типы
├── tests/             тесты Vitest
├── web/               React + Vite
└── vite.config.ts     конфиг фронтенда (прокси на API)
```
