import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { defaultAiService } from "./src/server/ai/aiService";
import { toHttpAiError } from "./src/server/ai/errors";
import { parseUploadedResumeText } from "./src/server/files/fileParseService";
import { toHttpFileError } from "./src/server/files/errors";
import { MAX_UPLOAD_JSON_BYTES } from "./src/server/files/validation";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: MAX_UPLOAD_JSON_BYTES }));
app.use((error: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error?.type === "entity.too.large") {
    const httpError = toHttpFileError(error);
    return res.status(httpError.status).json(httpError.body);
  }
  return next(error);
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", mode: process.env.NODE_ENV });
});

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
      const parsed = await defaultAiService.parseResume({
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
    const matchResult = await defaultAiService.matchPosition({
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
    const reply = await defaultAiService.chatAboutPosition({
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

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
