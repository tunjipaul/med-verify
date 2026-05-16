import Redis from "ioredis";
import { env } from "../config/env";

type RedisLike = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: "EX", seconds: number): Promise<unknown>;
  del(key: string): Promise<number>;
  disconnect(): void;
};

const globalForRedis = globalThis as unknown as { redis?: RedisLike };

function createInMemoryRedis(): RedisLike {
  const store = new Map<string, string>();

  return {
    async get(key: string): Promise<string | null> {
      return store.get(key) ?? null;
    },
    async set(key: string, value: string): Promise<unknown> {
      store.set(key, value);
      return "OK";
    },
    async del(key: string): Promise<number> {
      return store.delete(key) ? 1 : 0;
    },
    disconnect(): void {
      store.clear();
    },
  };
}

function createRedisClient(): RedisLike {
  if (process.env.NODE_ENV === "test") {
    return createInMemoryRedis();
  }

  return new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
  });
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
