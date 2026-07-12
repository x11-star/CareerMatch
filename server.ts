import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", mode: process.env.NODE_ENV });
});

// Helper to robustly clean and parse JSON strings returned by AI models
function cleanAndParseJSON(rawText: string): any {
  let cleaned = rawText.trim();
  
  // Remove markdown code blocks if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim();
  }
  
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    // Attempt to extract the outermost JSON object
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        throw new Error("Failed to parse extracted JSON block: " + e.message);
      }
    }
    throw err;
  }
}

const RESUME_SCHEMA = {
  type: Type.OBJECT,
  required: ["name", "graduationYear", "school", "major", "skills", "internships", "projects", "inferredDirection", "targetCities"],
  properties: {
    name: { type: Type.STRING },
    graduationYear: { type: Type.STRING },
    school: { type: Type.STRING },
    major: { type: Type.STRING },
    skills: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    internships: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["company", "role", "duration"],
        properties: {
          company: { type: Type.STRING },
          role: { type: Type.STRING },
          duration: { type: Type.STRING }
        }
      }
    },
    projects: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["name", "role", "tech"],
        properties: {
          name: { type: Type.STRING },
          role: { type: Type.STRING },
          tech: { type: Type.STRING }
        }
      }
    },
    inferredDirection: { type: Type.STRING },
    targetCities: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    }
  }
};

app.post("/api/parse-resume", async (req, res) => {
  const { text, fileData, mimeType, fileName } = req.body;

  let finalPromptText = "";
  let isMultiModalFile = false;
  let inlineFileData: any = null;

  try {
    // 1. Determine if we are handling raw text or a file
    if (fileData && mimeType) {
      console.log(`Received file upload: ${fileName} (${mimeType}), size: ${fileData.length} chars`);
      
      const isDocx = mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
                     (fileName && fileName.endsWith(".docx"));
      const isPdf = mimeType === "application/pdf" || 
                    (fileName && fileName.endsWith(".pdf"));
                     
      if (isDocx) {
        // Extract text from docx using mammoth
        console.log("Extracting text from DOCX...");
        const buffer = Buffer.from(fileData, "base64");
        const mammothResult = await mammoth.extractRawText({ buffer });
        const extractedText = mammothResult.value;
        if (!extractedText || !extractedText.trim()) {
          throw new Error("未能从 Word 简历中提取到任何文字，请确保文件内容非空");
        }
        console.log(`Extracted ${extractedText.length} characters of text from Word file.`);
        finalPromptText = extractedText;
      } else if (isPdf) {
        // Extract text from PDF using pdf-parse
        console.log("Extracting text from PDF...");
        const buffer = Buffer.from(fileData, "base64");
        try {
          const parser = new PDFParse({ data: buffer });
          const pdfResult = await parser.getText();
          const extractedText = pdfResult.text;
          await parser.destroy();
          
          if (!extractedText || !extractedText.trim()) {
            throw new Error("未能从 PDF 简历中提取到任何文字，请确保 PDF 文件非扫描版或内容非空");
          }
          console.log(`Extracted ${extractedText.length} characters of text from PDF file.`);
          finalPromptText = extractedText;
        } catch (pdfErr: any) {
          console.error("Failed to parse PDF using pdf-parse:", pdfErr);
          throw new Error(`PDF 解析失败: ${pdfErr.message || pdfErr}`);
        }
      } else if (mimeType.startsWith("image/")) {
        // Multi-modal format for Gemini
        console.log("Setting up multi-modal parsing for Image...");
        isMultiModalFile = true;
        inlineFileData = {
          data: fileData,
          mimeType: mimeType
        };
      } else {
        // Fallback: try parsing as text
        console.log("Treating file as plain text...");
        const buffer = Buffer.from(fileData, "base64");
        finalPromptText = buffer.toString("utf-8");
      }
    } else if (text && typeof text === "string" && text.trim()) {
      finalPromptText = text;
    } else {
      return res.status(400).json({ error: "请提供有效的简历文本或文件内容" });
    }

    // 2. Setup standard parse prompt
    const parsePrompt = `请深度解析以下简历，并根据其背景与优势匹配得出结构化的JSON数据：
    
${finalPromptText ? `简历内容：\n${finalPromptText}` : "请阅读所附的简历图像或PDF文件并进行解析。"}

请严格遵守以下JSON格式输出，不要包含任何多余文字或markdown包裹：
{
  "name": "姓名",
  "graduationYear": "毕业年份（例如2026）",
  "school": "就读院校",
  "major": "就读专业",
  "skills": ["技能1", "技能2", ...],
  "internships": [
    { "company": "公司名", "role": "岗位/角色", "duration": "时间范围" }
  ],
  "projects": [
    { "name": "项目名", "role": "角色/职责", "tech": "技术栈描述" }
  ],
  "inferredDirection": "AI推断的求职方向，例如：互联网核心研发工程师、国企/央企数字化管理等",
  "targetCities": ["期望城市1", "期望城市2", ...]
}`;

    // 3. If it's multi-modal (PDF/Image), we must use Gemini directly since DeepSeek is text-only
    if (isMultiModalFile && inlineFileData) {
      console.log("Calling Gemini for multi-modal parsing...");
      if (!process.env.GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY not found in environment variables.");
      }
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: {
          parts: [
            {
              inlineData: inlineFileData
            },
            {
              text: parsePrompt
            }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: RESUME_SCHEMA
        }
      });

      const textResponse = response.text;
      if (textResponse) {
        const parsed = cleanAndParseJSON(textResponse);
        return res.json(parsed);
      }
      throw new Error("No response from Gemini API for multi-modal file");
    }

    // 4. For text-based (including extracted docx), try DeepSeek, then fallback to Gemini
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    if (deepseekKey) {
      try {
        console.log("Using DeepSeek API key for parsing...");
        const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${deepseekKey}`
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
              { role: "system", content: "You are an expert HR assistant. You always respond with pure JSON." },
              { role: "user", content: parsePrompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.2
          })
        });

        if (!response.ok) {
          throw new Error(`DeepSeek API returned error status ${response.status}`);
        }

        const responseData = await response.json();
        const content = responseData.choices?.[0]?.message?.content;
        if (content) {
          const parsed = cleanAndParseJSON(content);
          return res.json(parsed);
        }
        throw new Error("Empty response from DeepSeek API");
      } catch (err: any) {
        console.error("DeepSeek call failed, falling back to Gemini:", err);
      }
    }

    // Fallback to Gemini for text-based parsing
    console.log("Using Gemini API for text parsing...");
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY not found in environment variables.");
    }
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: parsePrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: RESUME_SCHEMA
      }
    });

    const textResponse = response.text;
    if (textResponse) {
      const parsed = cleanAndParseJSON(textResponse);
      return res.json(parsed);
    }
    throw new Error("No response from Gemini API");

  } catch (err: any) {
    console.error("Parse resume endpoint failed:", err);
    return res.status(500).json({ error: `AI解析简历失败: ${err.message}` });
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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
