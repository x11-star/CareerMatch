import express from "express";
import { defaultAiService, createAiService } from "./ai/aiService";
import { toHttpAiError } from "./ai/errors";
import { parseUploadedResumeText } from "./files/fileParseService";
import { toHttpFileError } from "./files/errors";
import { MAX_UPLOAD_JSON_BYTES } from "./files/validation";
import { registerAuthRoutes } from "./routes/authRoutes";
import { registerMeRoutes } from "./routes/meRoutes";
import { registerResumeRoutes } from "./routes/resumeRoutes";
import { registerAssessmentRoutes } from "./routes/assessmentRoutes";
import { registerPositionRoutes } from "./routes/positionRoutes";
import { registerFavoriteRoutes } from "./routes/favoriteRoutes";

type AiService = ReturnType<typeof createAiService>;

type CreateAppOptions = {
  aiService?: AiService;
};

export function createApp(options: CreateAppOptions = {}) {
  const app = express();
  const aiService = options.aiService || defaultAiService;

  app.use(express.json({ limit: MAX_UPLOAD_JSON_BYTES }));
  app.use((error: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (error?.type === "entity.too.large") {
      const httpError = toHttpFileError(error);
      return res.status(httpError.status).json(httpError.body);
    }
    return next(error);
  });

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", mode: process.env.NODE_ENV });
  });

  registerAuthRoutes(app);
  registerMeRoutes(app);
  registerResumeRoutes(app);
  registerAssessmentRoutes(app);
  registerPositionRoutes(app);
  registerFavoriteRoutes(app);

  app.post("/api/parse-resume", async (req, res) => {
    const { text, fileData, mimeType, fileName } = req.body;

    try {
      let extracted;

      if (text && typeof text === "string" && text.trim()) {
        extracted = { text: text.trim(), sourceType: "text" as const, fileName: "粘贴的简历文本.txt", warnings: [] };
      } else if (fileData) {
        extracted = await parseUploadedResumeText({ fileData, mimeType, fileName });
      } else {
        return res.status(400).json({ error: "请提供有效的简历文本或文件内容" });
      }

      try {
        const parsed = await aiService.parseResume({
          extractedText: extracted.text,
          fileName: extracted.fileName,
          sourceType: extracted.sourceType,
        });
        return res.json({ ...parsed, _warnings: extracted.warnings });
      } catch (error) {
        const httpError = toHttpAiError(error);
        return res.status(httpError.status).json(httpError.body);
      }
    } catch (error) {
      console.error("Resume parse endpoint failed:", error);
      const httpError = toHttpFileError(error);
      return res.status(httpError.status).json(httpError.body);
    }
  });

  app.post("/api/match-position", async (req, res) => {
    const { resumeData, personalityResult, position } = req.body;

    if (!position) {
      return res.status(400).json({ error: "Missing position data" });
    }

    try {
      const matchResult = await aiService.matchPosition({
        resumeData: resumeData || {},
        personalityResult: personalityResult || {},
        position,
      });
      return res.json(matchResult);
    } catch (error) {
      const httpError = toHttpAiError(error);
      return res.status(httpError.status).json(httpError.body);
    }
  });

  app.post("/api/position-chat", async (req, res) => {
    const { position, messages, resumeData } = req.body;

    if (!position) {
      return res.status(400).json({ error: "Missing position data" });
    }

    try {
      const reply = await aiService.chatAboutPosition({
        position,
        messages: (messages || []).map((m: any) => ({
          sender: m.sender === "user" ? "user" : "assistant",
          text: String(m.text || ""),
        })),
        resumeData,
      });
      return res.json({ reply });
    } catch (error) {
      const httpError = toHttpAiError(error);
      return res.status(httpError.status).json(httpError.body);
    }
  });

  return app;
}
