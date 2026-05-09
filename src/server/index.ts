import "dotenv/config";
import { createApp } from "./app.js";

if (!process.env.TWITCH_EXTENSION_SECRET) {
  throw new Error("TWITCH_EXTENSION_SECRET is required");
}

const port = Number(process.env.PORT ?? 3001);
const app = createApp();

app.listen(port, () => {
  console.log(`Gestald Vote EBS listening on http://localhost:${port}`);
});
