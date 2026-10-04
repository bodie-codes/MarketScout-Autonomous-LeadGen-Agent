import { z } from "zod";
import { runScoutAgent } from "@/lib/agent";
import { checkLimits } from "@/lib/ratelimit";
import type { AgentEvent } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // seconds Vercel allows this request to run

const InputSchema = z.object({
  offer: z
    .string()
    .trim()
    .min(10, "Please describe what you offer in at least 10 characters.")
    .max(300, "Please keep your offer under 300 characters."),
  target: z
    .string()
    .trim()
    .min(5, "Please describe who you're looking for in at least 5 characters.")
    .max(200, "Please keep the target under 200 characters."),
});

// Finds out who the visitor is (by their internet address)
function getVisitor(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: Request) {
  if (!process.env.GROQ_API_KEY || !process.env.TAVILY_API_KEY) {
    return Response.json({ error: "The server is missing its API keys." }, { status: 500 });
  }

  // 1. Check the input first (invalid input never uses up the visitor's limit)
  const body = await req.json().catch(() => null);
  const parsed = InputSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  // 2. Usage limits: protect the search and AI budget
  try {
    const problem = await checkLimits(getVisitor(req));
    if (problem) {
      return Response.json({ error: problem }, { status: 429 });
    }
  } catch (error) {
    console.error("[MarketScout] rate limit check failed:", error);
    return Response.json(
      { error: "The live demo is temporarily unavailable. Please try again later." },
      { status: 503 }
    );
  }

  // 3. Run the agent and stream every step to the browser, one JSON message per line
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: AgentEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));

      try {
        const { leads, stats } = await runScoutAgent(parsed.data, emit);
        emit({ type: "result", leads, stats });
      } catch (error) {
        console.error("[MarketScout] agent error:", error);
        emit({ type: "error", error: "The agent ran into a problem. Please try again in a minute." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}