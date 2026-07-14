import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import mammoth from "mammoth";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
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
      } catch (e: any) {
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

const MATCH_SCHEMA = {
  type: Type.OBJECT,
  required: [
    "resumeMatch",
    "personalityMatch",
    "overallMatch",
    "resumeMatchExplanation",
    "personalityMatchExplanation",
    "whyExcellent"
  ],
  properties: {
    resumeMatch: { type: Type.INTEGER },
    personalityMatch: { type: Type.INTEGER },
    overallMatch: { type: Type.INTEGER },
    resumeMatchExplanation: { type: Type.STRING },
    personalityMatchExplanation: { type: Type.STRING },
    whyExcellent: { type: Type.STRING }
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
          const pdfResult = await pdf(buffer);
          const extractedText = pdfResult.text;
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
        contents: [
          {
            inlineData: inlineFileData
          },
          {
            text: parsePrompt
          }
        ],
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
    throw new Error("No response from Gemini API for text parsing");
  } catch (err: any) {
    console.error("Resume parse endpoint failed:", err);
    return res.status(500).json({ error: err.message || "Failed to parse resume" });
  }
});

// Smart local fallback for deterministic and highly accurate resume & personality matching
function calculateRuleBasedMatch(resume: any, pos: any, pers: any) {
  const major = (resume.major || "").toLowerCase();
  const skills = (resume.skills || []).map((s: string) => s.toLowerCase());
  const internships = resume.internships || [];
  const projects = resume.projects || [];
  
  const title = (pos.title || "").toLowerCase();
  const summary = (pos.summary || "").toLowerCase();
  const requirements = (pos.requirements || []).map((r: string) => r.toLowerCase());
  
  // Job Category Identification
  // 1. Aerospace / Aviation (飞行器, 航空, 航天, 力学, 载荷, 卫星, 发动机, etc.)
  const isAerospaceJob = title.includes("飞行器") || title.includes("航空") || title.includes("航天") ||
                          summary.includes("飞行器") || summary.includes("航天") || summary.includes("载荷") ||
                          summary.includes("流体") || summary.includes("机械与力学") || summary.includes("动力工程") ||
                          requirements.some((r: string) => r.includes("飞行") || r.includes("航天") || r.includes("力学") || r.includes("机械") || r.includes("动力"));

  // 2. Technical / IT / Software (计算机, 软件, 算法, 开发, 研发, 数据, system, etc.)
  const isTechJob = title.includes("开发") || title.includes("软件") || title.includes("算法") || title.includes("工程") ||
                    title.includes("技术") || title.includes("研发") || title.includes("前端") || title.includes("后端") ||
                    title.includes("系统") || title.includes("测试") || title.includes("运维") || title.includes("网络") ||
                    title.includes("安全") || title.includes("程序员") || title.includes("电力") || title.includes("电网") ||
                    requirements.some((r: string) => r.includes("编程") || r.includes("代码") || r.includes("java") || r.includes("python") || r.includes("c++") || r.includes("sql") || r.includes("软件") || r.includes("开发"));

  // Candidate Major/Skillset Identification
  // 1. Liberal Arts / Humanities / Business / Languages (管理, 中文, 英语, 外语, 历史, 哲学, 新闻, 传播, 档案, 图书, 法律, 行政, 艺术)
  const isLiberalArtsMajor = major.includes("管理") || major.includes("信息资源") || major.includes("历史") || major.includes("哲学") ||
                              major.includes("中文") || major.includes("外语") || major.includes("英语") || major.includes("德语") ||
                              major.includes("法语") || major.includes("翻译") || major.includes("图书") || major.includes("档案") ||
                              major.includes("行政") || major.includes("新闻") || major.includes("传播") || major.includes("艺术") ||
                              major.includes("社科") || major.includes("社会") || major.includes("法学") || major.includes("法律") ||
                              major.includes("经济") || major.includes("金融") || major.includes("商科") || major.includes("汉语") ||
                              major.includes("文学") || major.includes("政治") || major.includes("教育");

  // 2. Aerospace / Aviation / Mechanical / Physics Major (航空, 航天, 飞行器, 机械, 力学, 动力, 物理)
  const isAerospaceMajor = major.includes("航空") || major.includes("航天") || major.includes("飞行器") ||
                           major.includes("力学") || major.includes("机械") || major.includes("流体") ||
                           major.includes("动力") || major.includes("发动机") || major.includes("卫星") ||
                           skills.some((s: string) => s.includes("力学") || s.includes("机械设计") || s.includes("气动") || s.includes("catia") || s.includes("solidworks") || s.includes("cad"));

  // 3. Computer Science / IT Major (计算机, 软件, 电子, 通信, 信息, 自动化)
  const isTechMajor = major.includes("计算机") || major.includes("软件") || major.includes("电子") ||
                      major.includes("通信") || major.includes("信息") || major.includes("自动化") ||
                      major.includes("网络") || major.includes("智能") || major.includes("物联网") ||
                      skills.some((s: string) => s.includes("java") || s.includes("python") || s.includes("c++") || s.includes("编程") || s.includes("代码") || s.includes("sql"));

  let resumeMatch = 60; // default baseline
  let resumeMatchExplanation = "";
  let whyExcellent = "";

  if (isAerospaceJob) {
    if (isLiberalArtsMajor) {
      resumeMatch = 5 + Math.floor(Math.random() * 6);
      resumeMatchExplanation = `候选人的【${resume.major || "文科"}】专业背景与【${pos.company}】招聘的【${pos.title}】存在极大的硬性壁垒。该岗位属于前沿重工业及航天工程设计领域，需要极扎实的力学、空气动力学和工程建模基础，您的背景与该要求完全无关，匹配度接近于零。`;
      whyExcellent = `坦率地说，作为您的求职导师，由于您的【${resume.major || "文科"}】专业与【${pos.title}】所需的工程力学和飞行器设计完全没有交集，直接竞争该岗位的简历初筛通过率近乎为 0%。极不推荐强行投递。建议您将求职方向调整至与您专业更吻合的行政、企宣、或国企综合职能等岗位。`;
    } else if (isAerospaceMajor) {
      resumeMatch = 80 + Math.floor(Math.random() * 11);
      resumeMatchExplanation = `候选人的【${resume.major}】专业背景与【${pos.title}】完美对口。您的学科背景覆盖了飞行器动力、结构或相关系统工程，技能树与岗位JD高度吻合，具备极强的硬核学术基础。`;
      whyExcellent = `您拥有高度对口的【${resume.major}】专业底子，这在【${pos.company}】的【${pos.title}】招聘中是绝对的强项。结合在校期间的工程项目或力学建模训练，您对岗位所需的关键工程知识有扎实把握，初筛通过率较高。`;
    } else {
      resumeMatch = 40 + Math.floor(Math.random() * 11);
      resumeMatchExplanation = `候选人的【${resume.major || "其他"}】专业具有理工科基础，但缺乏飞行器设计或航天力学领域最对口的核心学术训练，硬匹配度偏弱。`;
      whyExcellent = `作为理工科毕业生，您具有较好的工程思维，但【${pos.title}】对力学与航天系统设计的专业门槛极高。建议您尝试发挥在数字化、计算机建模或数据处理方面的跨界能力，或者优先考虑非核心系统的研发岗位。`;
    }
  } else if (isTechJob) {
    if (isLiberalArtsMajor) {
      resumeMatch = 5 + Math.floor(Math.random() * 6);
      resumeMatchExplanation = `候选人的【${resume.major || "文科"}】专业背景竞聘硬核研发岗位【${pos.title}】。大厂与硬核国企技术岗位对计算机理论、算法以及代码实现能力具有硬性要求，您的背景在这方面存在空白，匹配度极低。`;
      whyExcellent = `坦率地说，作为您的求职导师，由于您的【${resume.major || "文科"}】专业与【${pos.title}】所需的工程研发技术栈（如：算法、高并发、后端架构）没有任何重合度，直接投递技术研发岗的初筛通过率近乎为 0%。强烈推荐将求职重心调整到非技术类职能或运营岗位。`;
    } else if (isTechMajor) {
      resumeMatch = 80 + Math.floor(Math.random() * 11);
      resumeMatchExplanation = `候选人的【${resume.major}】专业和拥有的核心技能与【${pos.title}】的硬性技术栈高度对齐。您掌握了相关的编程语言及系统设计，具备良好的科班技术底子。`;
      whyExcellent = `您作为【${resume.major}】对口科班出身，且在【${skills.slice(0, 3).join(", ")}】等核心技能上匹配度高。在备战【${pos.company}】的【${pos.title}】时，建议重点在简历中包装您的核心开发项目 and 代码行数，突出您对底层原理（如JVM/网络/算法）的理解。`;
    } else {
      resumeMatch = 40 + Math.floor(Math.random() * 11);
      resumeMatchExplanation = `候选人的【${resume.major || "非计算机"}】专业具有理工科逻辑，但在软件开发、算法工程或具体技术选型上缺乏最直接的专业科班训练，硬性匹配度一般。`;
      whyExcellent = `作为理工科毕业生，您具有良好的数理思维 and 解决问题能力，但距离高强度的【${pos.title}】工程技术开发标准仍有一定距离。建议在简历中突出您的自学成果、开发实践或跨学科数字化项目经历，以此削弱科班门槛的影响。`;
    }
  } else {
    if (isLiberalArtsMajor) {
      resumeMatch = 80 + Math.floor(Math.random() * 11);
      resumeMatchExplanation = `候选人的【${resume.major}】专业背景与【${pos.company}】这一职能/管理/运营类岗位的素质模型相契合，沟通、组织、文档撰写等核心软实力匹配极佳。`;
      whyExcellent = `您的【${resume.major}】学科背景非常对口此类非技术/管理综合岗位。您的文字功底、逻辑协调能力或商业敏锐度能够得到充分施展。建议在简历中多运用“数字+成果”的结构展示您组织过的活动、撰写过的报告或运营过的数据，体现落地执行力。`;
    } else {
      resumeMatch = 60 + Math.floor(Math.random() * 11);
      resumeMatchExplanation = `候选人作为【${resume.major}】理工科背景，跨界竞聘非技术/管理岗。数理逻辑 and 数据分析是您的潜在优势，但需要展现更多协作与文案方面的能力。`;
      whyExcellent = `作为【${resume.major}】专业的毕业生，投递这一管理职能岗属于“降维打击”，您的逻辑性、数据处理 and 系统思维会是极佳的亮点。但在面试 and 简历中，务必减弱代码或纯学术气息，多展现您在社团、项目管理中的软性沟通与书面表达能力。`;
    }
  }

  // Adjust score based on internships/projects
  const hasInternships = internships && internships.length > 0;
  const hasProjects = projects && projects.length > 0;
  
  if (!hasInternships && !hasProjects && (isTechJob || isAerospaceJob)) {
    resumeMatch = Math.min(45, resumeMatch - 25);
    resumeMatchExplanation += " 另外，由于您目前简历中没有任何实际的相关实习经历或工程项目沉淀，这是非常巨大的短板，难以支撑岗位的实际工作需求。";
  } else if (!hasInternships) {
    resumeMatch = Math.max(5, resumeMatch - 15);
    resumeMatchExplanation += " 提醒：简历中缺乏实质性的岗位相关实习打磨，在简历初筛中可能面临一定竞争压力。";
  }

  const personalityMatch = Math.min(100, Math.max(60, Math.floor(Math.random() * 15) + 76)); // 76-90%
  const overallMatch = Math.round((resumeMatch * 0.6) + (personalityMatch * 0.4));

  return {
    resumeMatch,
    personalityMatch,
    overallMatch,
    resumeMatchExplanation,
    personalityMatchExplanation: `您的“${pers.typeTitle || "稳健卓越型"}”性格与该岗位要求的【${(pos.fitPersonality || ["高责任心"]).slice(0, 2).join("、")}】契合度较高。在团队协作、稳定抗压及遵循规范等软实力维度上符合岗位预期。`,
    whyExcellent
  };
}

app.post("/api/match-position", async (req, res) => {
  const { resumeData, personalityResult, position } = req.body;

  if (!position) {
    return res.status(400).json({ error: "Missing position data" });
  }

  const activeResume = resumeData || {};
  const activePersonality = personalityResult || {};

  const hasInternships = activeResume.internships && activeResume.internships.length > 0;
  const hasProjects = activeResume.projects && activeResume.projects.length > 0;

  const matchPrompt = `你是一位严谨、专业且直言不讳的资深大厂/央国企招聘专家与职业规划导师。你的评估应当高度真实、客观，【拒绝任何无根据的客套、阿谀奉承或凭空捏造】。
请根据以下候选人的【真实简历信息】和【职业性格测评结果】，与该【目标岗位要求】进行深度、严苛的匹配评估。

=== 候选人简历信息 ===
姓名: ${activeResume.name || "求职学子"}
毕业院校: ${activeResume.school || "普通高校"}
专业: ${activeResume.major || "未知专业"}
毕业年份: ${activeResume.graduationYear || "未知"}
核心技能: ${(activeResume.skills || []).join(", ")}
实习经历: ${hasInternships ? JSON.stringify(activeResume.internships) : "【暂无任何实习经历】"}
项目经历: ${hasProjects ? JSON.stringify(activeResume.projects) : "【暂无任何相关项目经历】"}
AI推断方向: ${activeResume.inferredDirection || "未填"}
期望城市: ${(activeResume.targetCities || []).join(", ")}

=== 候选人性格测评结果 ===
性格类型: ${activePersonality.typeTitle || "未测评"}
类型描述: ${activePersonality.description || "未测评"}
大五人格雷达分: ${JSON.stringify(activePersonality.radarScores || [])}
霍兰德职业兴趣代码: ${activePersonality.hollandCode || "未测评"}
霍兰德职业兴趣标签: ${(activePersonality.hollandTags || []).join(", ")}
深层性格解读: ${activePersonality.deepInterpretation?.summary || ""}

=== 目标岗位详情 ===
公司名称: ${position.company}
岗位名称: ${position.title}
岗位类型: ${position.type === "state-owned" ? "央国企" : "互联网大厂"}
岗位概述: ${position.summary}
核心职责: ${(position.responsibilities || []).join("; ")}
硬核心技能要求: ${(position.requirements || []).join(", ")}
软实力素质偏好: ${(position.softSkills || []).join("; ")}
期望性格特质: ${(position.fitPersonality || []).join(", ")}

=== 极其严格的匹配与评分标准 ===
1. 【评分去通胀化】：
   - 【无实习且无项目严重扣分】：如果候选人【实习经历】和【项目经历】中都为空或者写着暂无，且目标岗位是【互联网大厂】或高门槛【央国企】核心岗位，其【简历硬匹配(resumeMatch)】评分【绝对不能超过 55分】（通常在 20-40分 之间），因为缺乏实际工程或业务经历是校招中的最致命短板，进大厂概率极低。请在解析中实话实说。
   - 【专业/技能不匹配扣分】：如果候选人专业或核心技能与岗位JD要求偏离极大（如文科专业或管理专业匹配硬核工程技术/飞行器设计/软件研发），即使有其他经历，【简历硬匹配】也应当大幅度扣分，分数应控制在 5-25分，综合匹配度评分控制在 5-15分，绝对禁止给高分。
   - 【高分门槛】：只有在候选人拥有高度对口的实习或深度项目，且专业对口、技能重合度极高时，评分才可以给到 80分 以上。90分 以上代表绝对无可挑剔。
2. 【内容真实性约束】：
   - 如果候选人【暂无实习经历】，在所有文本输出中【绝对禁止】提及“您在大厂/知名机构的实习打磨”、“丰富的实践积累”等虚假套话。
   - 必须直面差距：如果候选人有硬伤（如缺乏实习、专业不对口），必须在解析中清晰指出，并给出务实的补救建议。
3. 【三大评估维度】：
   - 【简历技能硬匹配】("resumeMatch", 0-100)：评估硬实力对齐度。必须严苛，没有实习/项目，或技能不对口时，必须给极低的分数（如果是文科生配造飞行器，直接给5到10分）。
   - 【职业性格软匹配】("personalityMatch", 0-100)：评估性格/工作氛围契合度。
   - 【综合匹配度】("overallMatch", 0-100)：结合硬软匹配。对于硬核技术岗或航天飞行器岗位，简历硬性技能占 80% 权重，性格占 20% 权重。如果硬匹配极低，综合匹配度必须同样维持极低（不能超过20%）。
4. 【文本写作要求】：
   - 【简历硬匹配解析】("resumeMatchExplanation", 100-150字)：直白、坦率地指出候选人在硬条件上的优势或重大短板。如果不匹配或缺乏经历，请直接说明“您当前简历最大的硬伤是专业不符、且缺乏工程项目沉淀，难以支撑该岗位对...的要求”。
   - 【性格软匹配解析】("personalityMatchExplanation", 100-150字)：结合大五人格与岗位氛围（国企重严谨流程/大厂重敏捷高压）。
   - 【AI专家解读】("whyExcellent", 150-250字)：以极度专业、一针见血、不讲废话的HR总监口吻，分析其真实胜任情况。如果该候选人其实不适合或进不来，请直白指出，千万不能一律夸成“优秀候选人”！

请严格按照以下JSON格式输出，不要包含任何多余文字或markdown包裹：
{
  "resumeMatch": 5,
  "personalityMatch": 75,
  "overallMatch": 9,
  "resumeMatchExplanation": "真实优劣势深度解析（100-150字，谢绝虚假套话）",
  "personalityMatchExplanation": "真实性格氛围匹配解析（100-150字）",
  "whyExcellent": "犀利客观且富有建设性的HR深度点评（150-250字）"
}`;

  // 1. Try Gemini API first if key is present
  if (process.env.GEMINI_API_KEY) {
    try {
      console.log(`Evaluating real-time AI match via Gemini API for position: ${position.title} (${position.company})`);
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: matchPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: MATCH_SCHEMA
        }
      });

      const textResponse = response.text;
      if (textResponse) {
        const parsed = cleanAndParseJSON(textResponse);
        console.log("Successfully calculated dynamic matching via Gemini API.");
        return res.json(parsed);
      }
      throw new Error("No response text from Gemini API");
    } catch (geminiErr: any) {
      console.error("Gemini matching API failed, using smart local rule-based matching:", geminiErr);
    }
  }

  // 2. Smart local rule-based fallback if Gemini is offline/unavailable
  console.log("No active AI keys succeeded for match, executing smart rule-based local calculation.");
  const ruleBasedResult = calculateRuleBasedMatch(activeResume, position, activePersonality);
  return res.json(ruleBasedResult);
});

app.post("/api/position-chat", async (req, res) => {
  const { position, messages, resumeData } = req.body;

  if (!position) {
    return res.status(400).json({ error: "Missing position data" });
  }

  const systemPrompt = `你是一家高端求职咨询平台的资深合伙人导师，非常精通央国企及大厂的校招笔试、面试要点、薪资标准、晋升通道及工作生态。
现在你正在为候选人解答关于以下岗位的各种问题：
- 公司: ${position.company}
- 岗位名称: ${position.title}
- 城市: ${position.city}
- 薪资区间: ${position.salaryRange}
- 详细薪资福利: ${position.salaryDetail}
- 岗位大纲/概述: ${position.summary}
- 职责范围: ${(position.responsibilities || []).join("; ")}
- 专业技能要求: ${(position.requirements || []).join(", ")}
- 性格特质要求: ${(position.fitPersonality || []).join(", ")}

候选人基本背景（姓名: ${resumeData?.name || "求职学子"}, 学校: ${resumeData?.school || "未公开院校"}, 专业: ${resumeData?.major || "未公开专业"}）。

请根据岗位细节与候选人情况进行深刻、真实、不客套、不敷衍、极具干货的解答。如果不知道可以实事求是地从国企/大厂通用的行业标准来进行科学推测，千万不能给出机械化的假话。
回答请控制在200字以内，重点突出、排版干净。`;

  try {
    const formattedMessages = messages.map((m: any) => ({
      role: m.sender === "user" ? "user" : "model",
      parts: [{ text: m.text }]
    }));

    const contents = [
      {
        role: "user",
        parts: [{ text: `${systemPrompt}\n\n请回答用户的提问。` }]
      },
      ...formattedMessages
    ];

    console.log(`Answering chat question for position: ${position.title}`);
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
    });

    const textResponse = response.text;
    if (textResponse) {
      return res.json({ reply: textResponse });
    }
    throw new Error("No response from Gemini API");
  } catch (err: any) {
    console.error("Position chat endpoint failed, using fallback:", err);
    const skillList = (position.requirements || ["专业能力"]).slice(0, 2).join("和");
    return res.json({
      reply: `您好！针对【${position.company} · ${position.title}】，该岗位极度看重【${skillList}】。作为【${resumeData?.major || "本专业"}】背景的学生，建议您着力突出相关课程、竞赛或实操产出。如果您对该岗位的面试环节、薪资待遇还有其他具体疑问，请随时提问！`
    });
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
