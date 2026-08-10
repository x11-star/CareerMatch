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
import { getOptionalAuth, requireAuth } from "./http/authMiddleware";
import { HttpError } from "./http/errors";
import { getLatestResumeByUserId } from "./repositories/resumesRepository";
import { getLatestAssessmentByUserId } from "./repositories/assessmentsRepository";
import { getPositionById } from "./repositories/positionsRepository";
import { findCachedMatchResult, createMatchResult } from "./repositories/matchResultsRepository";
import { toResumeData } from "./mappers/resumeMapper";
import { toPersonalityResult } from "./mappers/assessmentMapper";
import { toPosition } from "./mappers/positionMapper";
import { stableJsonHash } from "./matching/hash";
import { defaultReportService, buildContentDisposition } from "./reports/reportService";
import { toHttpReportError, ReportError } from "./reports/reportErrors";

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
    try {
      const user = await getOptionalAuth(req);

      if (user && req.body?.positionId) {
        const resume = await getLatestResumeByUserId(user.id);
        if (!resume) {
          throw new HttpError(409, "RESUME_REQUIRED", "请先上传并确认简历");
        }

        const assessment = await getLatestAssessmentByUserId(user.id);
        if (!assessment) {
          throw new HttpError(409, "ASSESSMENT_REQUIRED", "请先完成职业测评");
        }

        const positionRecord = await getPositionById(String(req.body.positionId));
        if (!positionRecord) {
          throw new HttpError(404, "POSITION_NOT_FOUND", "岗位不存在");
        }

        const mappedResume = toResumeData(resume);
        const mappedAssessment = toPersonalityResult(assessment);
        const mappedPosition = toPosition(positionRecord);
        const resumeHash = stableJsonHash(mappedResume);
        const assessmentHash = stableJsonHash(mappedAssessment);
        const cached = await findCachedMatchResult({
          userId: user.id,
          resumeId: resume.id,
          assessmentId: assessment.id,
          positionId: positionRecord.id,
          resumeHash,
          assessmentHash,
        });

        if (cached) {
          return res.json({
            cached: true,
            resumeMatch: cached.resumeMatch,
            personalityMatch: cached.personalityMatch,
            overallMatch: cached.overallMatch,
            resumeMatchExplanation: cached.resumeMatchExplanation,
            personalityMatchExplanation: cached.personalityMatchExplanation,
            whyExcellent: cached.whyExcellent,
          });
        }

        const matchResult = await aiService.matchPosition({
          resumeData: mappedResume,
          personalityResult: mappedAssessment,
          position: mappedPosition,
        });
        await createMatchResult({
          userId: user.id,
          resumeId: resume.id,
          assessmentId: assessment.id,
          positionId: positionRecord.id,
          resumeHash,
          assessmentHash,
          resumeMatch: matchResult.resumeMatch,
          personalityMatch: matchResult.personalityMatch,
          overallMatch: matchResult.overallMatch,
          resumeMatchExplanation: matchResult.resumeMatchExplanation,
          personalityMatchExplanation: matchResult.personalityMatchExplanation,
          whyExcellent: matchResult.whyExcellent,
          provider: "unknown",
          model: "unknown",
        });
        return res.json({ cached: false, ...matchResult });
      }

      const { resumeData, personalityResult, position } = req.body;
      if (!position) {
        return res.status(400).json({ error: "Missing position data" });
      }

      const matchResult = await aiService.matchPosition({
        resumeData: resumeData || {},
        personalityResult: personalityResult || {},
        position,
      });
      return res.json(matchResult);
    } catch (error) {
      if (error instanceof HttpError) {
        return res.status(error.status).json({ code: error.code, error: error.message });
      }
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

  app.post("/api/reports/export", async (req, res) => {
    try {
      const user = await requireAuth(req);

      const positionId = String(req.body?.positionId || "");
      if (!positionId) {
        throw new HttpError(400, "POSITION_REQUIRED", "缺少岗位 ID");
      }

      const resume = await getLatestResumeByUserId(user.id);
      if (!resume) {
        throw new HttpError(409, "RESUME_MISSING", "请先上传并确认简历后再导出报告");
      }

      const assessment = await getLatestAssessmentByUserId(user.id);
      if (!assessment) {
        throw new HttpError(409, "ASSESSMENT_MISSING", "请先完成职业测评后再导出报告");
      }

      const positionRecord = await getPositionById(positionId);
      if (!positionRecord) {
        throw new HttpError(404, "POSITION_NOT_FOUND", "岗位不存在");
      }

      const mappedResume = toResumeData(resume);
      const mappedAssessment = toPersonalityResult(assessment);
      const mappedPosition = toPosition(positionRecord);
      const resumeHash = stableJsonHash(mappedResume);
      const assessmentHash = stableJsonHash(mappedAssessment);
      const cached = await findCachedMatchResult({
        userId: user.id,
        resumeId: resume.id,
        assessmentId: assessment.id,
        positionId: positionRecord.id,
        resumeHash,
        assessmentHash,
      });
      if (!cached) {
        throw new HttpError(409, "MATCH_NOT_CACHED", "请先打开岗位诊断页生成匹配结果");
      }

      const result = await defaultReportService.exportPositionReport({
        userId: user.id,
        resume: mappedResume,
        assessment: mappedAssessment,
        matchResult: {
          resumeMatch: cached.resumeMatch,
          personalityMatch: cached.personalityMatch,
          overallMatch: cached.overallMatch,
          resumeMatchExplanation: cached.resumeMatchExplanation,
          personalityMatchExplanation: cached.personalityMatchExplanation,
          whyExcellent: cached.whyExcellent,
        },
        position: mappedPosition,
        positionId: positionRecord.id,
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", buildContentDisposition(result.fileName));
      return res.status(200).send(result.buffer);
    } catch (error) {
      if (error instanceof HttpError) {
        return res.status(error.status).json({ code: error.code, error: error.message });
      }
      // ReportError (missing data / render failure / too large) is a known, user-facing error;
      // only truly unexpected throws need a stack trace for debugging.
      if (!(error instanceof ReportError)) {
        console.error("[/api/reports/export] unexpected error:", error);
      }
      const httpError = toHttpReportError(error);
      return res.status(httpError.status).json(httpError.body);
    }
  });

  return app;
}
