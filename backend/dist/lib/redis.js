"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("../config/env");
const globalForRedis = globalThis;
function createInMemoryRedis() {
    const store = new Map();
    return {
        async get(key) {
            return store.get(key) ?? null;
        },
        async set(key, value) {
            store.set(key, value);
            return "OK";
        },
        async del(key) {
            return store.delete(key) ? 1 : 0;
        },
        disconnect() {
            store.clear();
        },
    };
}
function createRedisClient() {
    if (process.env.NODE_ENV === "test") {
        return createInMemoryRedis();
    }
    return new ioredis_1.default(env_1.env.REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 2,
    });
}
exports.redis = globalForRedis.redis ?? createRedisClient();
if (process.env.NODE_ENV !== "production") {
    globalForRedis.redis = exports.redis;
}
//# sourceMappingURL=redis.js.map