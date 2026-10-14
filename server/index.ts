import { createApp } from "./app";

const PORT = Number(process.env.PORT) || 3000;

createApp().listen(PORT, () => {
  console.log(`Price bot API: http://localhost:${PORT}  (POST /reprice)`);
});
