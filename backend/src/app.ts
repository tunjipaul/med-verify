import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { setupSwagger } from "./config/swagger";
import { attachRequestId } from "./middleware/security.middleware";
import routes from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";

const app = express();
app.set("trust proxy", 1);
const allowedOrigins = env.ALLOWED_ORIGINS.split(",")
  .map((item) => item.trim())
  .filter(Boolean);

app.use(helmet());
app.use(attachRequestId);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        if (env.NODE_ENV === "production") {
          callback(new Error("CORS origin required"));
          return;
        }
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("CORS origin not allowed"));
    },
    credentials: true,
  }),
);
app.use(morgan("dev"));
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
if (env.NODE_ENV !== "production") {
  setupSwagger(app);
}

app.use("/api/v1", routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
