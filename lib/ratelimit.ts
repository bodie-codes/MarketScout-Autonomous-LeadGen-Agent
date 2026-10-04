import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Change these numbers any time
const PER_VISITOR_RUNS = 3; // per visitor, per hour
const DAILY_RUNS = 15; // for the whole demo, per day
const MONTHLY_RUNS = 100; // for the whole demo, per 30 days (Tavily free plan budget)

// Shared memory in the cloud, so the limits work on every Vercel server
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? Redis.fromEnv() : null;

const limiters = redis
  ? {
      visitor: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(PER_VISITOR_RUNS, "1 h"),
        prefix: "marketscout:visitor",
      }),
      daily: new Ratelimit({
        redis,
        limiter: Ratelimit.fixedWindow(DAILY_RUNS, "1 d"),
        prefix: "marketscout:daily",
      }),
      monthly: new Ratelimit({
        redis,
        limiter: Ratelimit.fixedWindow(MONTHLY_RUNS, "30 d"),
        prefix: "marketscout:monthly",
      }),
    }
  : null;

// Returns null if the visitor may run the agent, or a message explaining why not
export async function checkLimits(visitor: string): Promise<string | null> {
  if (!limiters) {
    // Without Upstash: allowed while developing, blocked in production (safety first)
    return process.env.NODE_ENV === "production" ? "The live demo is not configured yet." : null;
  }

  const perVisitor = await limiters.visitor.limit(visitor);
  if (!perVisitor.success) {
    return `You can run the agent ${PER_VISITOR_RUNS} times per hour. Please try again a bit later.`;
  }

  const [daily, monthly] = await Promise.all([limiters.daily.limit("all"), limiters.monthly.limit("all")]);
  if (!monthly.success) {
    return "The live demo has used its research budget for this month. Please check back soon.";
  }
  if (!daily.success) {
    return "The live demo has reached today's limit. Please come back tomorrow.";
  }

  return null;
}