import express from "express";
import path from "path";
import { createRequire } from "module";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import mammoth from "mammoth";
import { defaultAiService } from "./src/server/ai/aiService";
import { toHttpAiError } from "./src/server/ai/errors";
import type { ResumeParseInput } from "./src/server/ai/types";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", mode: process.env.NODE_ENV });
});

function sourceTypeFromUpload(mimeType?: string, fileName?: string): ResumeParseInput["sourceType"] {
  if (mimeType === "application/pdf" || fileName?.toLowerCase().endsWith(".pdf")) {
    return "pdf";
  }
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileName?.toLowerCase().endsWith(".docx")
  ) {
    return "docx";
  }
  if (fileName?.toLowerCase().endsWith(".txt")) {
    return "txt";
  }
  return "text";
}

app.post("/api/parse-resume", async (req, res) => {
  const { text, fileData, mimeType, fileName } = req.body;

  let finalPromptText = "";
  let isMultiModalFile = false;
  let sourceType: ResumeParseInput["sourceType"] = sourceTypeFromUpload(mimeType, fileName);

  try {
    if (fileData && mimeType) {
      console.log(`Received file upload: ${fileName} (${mimeType}), size: ${fileData.length} chars`);

      const isDocx = mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        (fileName && fileName.toLowerCase().endsWith(".docx"));
      const isPdf = mimeType === "application/pdf" ||
        (fileName && fileName.toLowerCase().endsWith(".pdf"));

      if (isDocx) {
        console.log("Extracting text from DOCX...");
        const buffer = Buffer.from(fileData, "base64");
        const mammothResult = await mammoth.extractRawText({ buffer });
        const extractedText = mammothResult.value;
        if (!extractedText || !extractedText.trim()) {
          throw new Error("未能从 Word 简历中提取到任何文字，请确保文件内容非空");
        }
        console.log(`Extracted ${extractedText.length} characters of text from Word file.`);
        finalPromptText = extractedText;
        sourceType = "docx";
      } else if (isPdf) {
        console.log("Extracting text from PDF...");
        const buffer = Buffer.from(fileData, "base64");
        try {
          const pdfResult = await pdf(buffer);
          const extractedText = pdfResult.text;
          if (!extractedText || !extractedText.trim()) {
            throw new Error("未能从 PDF 简历中提取到任何文字，请确保 PDF 文件非扫描版或内容非空");
          }
          console.log(`Extracted ${extractedText.length} characters of text from PDF file.`);
          finalPromptText = extractedText;
          sourceType = "pdf";
        } catch (pdfErr: any) {
          console.error("Failed to parse PDF using pdf-parse:", pdfErr);
          throw new Error(`PDF 解析失败: ${pdfErr.message || pdfErr}`);
        }
      } else if (mimeType.startsWith("image/")) {
        isMultiModalFile = true;
      } else {
        console.log("Treating file as plain text...");
        const buffer = Buffer.from(fileData, "base64");
        finalPromptText = buffer.toString("utf-8");
        sourceType = sourceTypeFromUpload(mimeType, fileName);
      }
    } else if (text && typeof text === "string" && text.trim()) {
      finalPromptText = text;
      sourceType = "text";
    } else {
      return res.status(400).json({ error: "请提供有效的简历文本或文件内容" });
    }

    if (isMultiModalFile) {
      return res.status(501).json({
        error: "图片简历解析需要 OCR 模块，下一阶段实现。本阶段支持文本、DOCX 和可提取文字的 PDF。",
        code: "OCR_NOT_IMPLEMENTED"
      });
    }

    try {
      const parsed = await defaultAiService.parseResume({
        extractedText: finalPromptText,
        fileName,
        sourceType,
      });
      return res.json(parsed);
    } catch (error) {
      const httpError = toHttpAiError(error);
      return res.status(httpError.status).json(httpError.body);
    }
  } catch (err: any) {
    console.error("Resume parse endpoint failed:", err);
    return res.status(500).json({ error: err.message || "Failed to parse resume" });
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
