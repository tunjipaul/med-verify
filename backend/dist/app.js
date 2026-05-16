"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const env_1 = require("./config/env");
const swagger_1 = require("./config/swagger");
const security_middleware_1 = require("./middleware/security.middleware");
const routes_1 = __importDefault(require("./routes"));
const error_middleware_1 = require("./middleware/error.middleware");
const app = (0, express_1.default)();
app.set("trust proxy", 1);
const allowedOrigins = env_1.env.ALLOWED_ORIGINS.split(",")
    .map((item) => item.trim())
    .filter(Boolean);
app.use((0, helmet_1.default)());
app.use(security_middleware_1.attachRequestId);
app.use((0, cors_1.default)({
    origin(origin, callback) {
        if (!origin) {
            if (env_1.env.NODE_ENV === "production") {
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
}));
app.use((0, morgan_1.default)("dev"));
app.use(express_1.default.json({ limit: "100kb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "100kb" }));
if (env_1.env.NODE_ENV !== "production") {
    (0, swagger_1.setupSwagger)(app);
}
app.use("/api/v1", routes_1.default);
app.use(error_middleware_1.notFoundHandler);
app.use(error_middleware_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map