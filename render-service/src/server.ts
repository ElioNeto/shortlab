import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { initBundle } from "./bundle.js";
import { executeRender } from "./render-worker.js";

// --- render status types ---

export type RenderStatus = "queued" | "rendering" | "done" | "error";

export interface RenderJob {
  renderId: string;
  jobId: string;
  clipIndex: number;
  status: RenderStatus;
  progress: number;
  outputUrl?: string;
  error?: string;
  createdAt: number;
}

// In-memory render job map with TTL cleanup
export const renderJobs = new Map<string, RenderJob>();
const RENDER_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Periodic cleanup of expired renders
setInterval(() => {
  const now = Date.now();
  for (const [id, job] of renderJobs.entries()) {
    if (now - job.createdAt > RENDER_TTL_MS) {
      renderJobs.delete(id);
      console.log(`[render] Cleaned up expired render ${id}`);
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes

// --- Request validation schema ---

const renderRequestSchema = z.object({
  jobId: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  clipIndex: z.number().int().min(0).max(100),
  props: z.object({
    videoUrl: z.string().url().max(2048),
    durationInFrames: z.number().int().positive().max(18000),
    fps: z.number().positive().max(120),
    width: z.number().int().positive().max(4096),
    height: z.number().int().positive().max(4096),
    subtitles: z.any().nullable().optional(),
    hook: z.any().nullable().optional(),
    effects: z.any().nullable().optional(),
  }),
});

// --- Express app ---

const app = express();

// CORS configuration
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:5173", "http://localhost:5175"];
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: "Too many requests, please try again later." },
});
app.use(limiter);

const PORT = parseInt(process.env.PORT || "3100", 10);
const OUTPUT_DIR = process.env.OUTPUT_DIR || "/output";

// Serve video files from the shared output volume so Remotion can access them via HTTP
// Path traversal protection: express.static handles this safely by default
app.use("/output", express.static(OUTPUT_DIR, {
  dotfiles: 'ignore',
  maxAge: '1d',
}));

// Health check
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Submit a render job
app.post("/render", (req, res) => {
  const parsed = renderRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid request body",
      details: parsed.error.issues,
    });
    return;
  }

  const { jobId, clipIndex, props } = parsed.data;
  const renderId = uuidv4();

  const job: RenderJob = {
    renderId,
    jobId,
    clipIndex,
    status: "queued",
    progress: 0,
    createdAt: Date.now(),
  };

  renderJobs.set(renderId, job);

  console.log(
    `[render] Queued render ${renderId} for job=${jobId} clip=${clipIndex}`
  );

  // Resolve video URL: convert frontend/backend URLs to renderer's own static server
  // The renderer serves /output/* from the shared Docker volume
  let resolvedVideoUrl = props.videoUrl;
  const videoPathMatch = props.videoUrl.match(/\/videos\/([^/]+)\/(.+)$/);
  if (videoPathMatch) {
    resolvedVideoUrl = `http://localhost:${PORT}/output/${videoPathMatch[1]}/${videoPathMatch[2]}`;
    console.log(`[render] Resolved video URL: ${props.videoUrl} -> ${resolvedVideoUrl}`);
  }

  // Fire and forget - render runs in background
  executeRender({
    renderId,
    jobId,
    clipIndex,
    props: {
      videoUrl: resolvedVideoUrl,
      durationInFrames: props.durationInFrames,
      fps: props.fps,
      width: props.width,
      height: props.height,
      subtitles: props.subtitles ?? null,
      hook: props.hook ?? null,
      effects: props.effects ?? null,
    },
  }).catch((err) => {
    console.error(`[render] Unhandled error for ${renderId}:`, err);
    const existingJob = renderJobs.get(renderId);
    if (existingJob) {
      existingJob.status = "error";
      existingJob.error =
        err instanceof Error ? err.message : "Unknown error";
    }
  });

  res.status(202).json({ renderId, status: "queued" });
});

// Get render status
app.get("/render/:renderId", (req, res) => {
  const { renderId } = req.params;
  const job = renderJobs.get(renderId);

  if (!job) {
    res.status(404).json({ error: "Render not found" });
    return;
  }

  const response: Record<string, unknown> = {
    renderId: job.renderId,
    status: job.status,
  };

  if (job.progress !== undefined) {
    response.progress = job.progress;
  }
  if (job.outputUrl) {
    response.outputUrl = job.outputUrl;
  }
  if (job.error) {
    response.error = job.error;
  }

  res.json(response);
});

// --- Start server ---

async function main() {
  console.log("[render-service] Initializing Remotion bundle...");
  await initBundle();
  console.log("[render-service] Bundle ready.");

  app.listen(PORT, () => {
    console.log(`[render-service] Listening on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error("[render-service] Fatal error during startup:", err);
  process.exit(1);
});
