import dotenv from "dotenv";

dotenv.config();

const MATCH_SCHEMA_PROMPT = `
请严格按照以下JSON格式输出，不要包含任何多余文字或markdown包裹：
{
  "resumeMatch": 55,
  "personalityMatch": 75,
  "overallMatch": 62,
  "resumeMatchExplanation": "真实优劣势深度解析（100-150字，谢绝虚假套话）",
  "personalityMatchExplanation": "真实性格氛围匹配解析（100-150字）",
  "whyExcellent": "犀利客观且富有建设性的HR深度点评（150-250字）"
}
`;

async function test() {
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  if (!deepseekKey) {
    console.log("No DeepSeek key");
    return;
  }

  try {
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${deepseekKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "You are an expert HR assistant. You always respond with pure JSON conforming to the requested format." },
          { role: "user", content: `Please evaluate matching for Name: Alice, School: Nanjing Agricultural Univ, Major: Information Resource Management, Applying to: Aerospace Systems Engineer at China Railway. \n\n${MATCH_SCHEMA_PROMPT}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2
      })
    });

    const data = await response.json();
    console.log("DeepSeek Schema Output:", data.choices?.[0]?.message?.content);
  } catch (err: any) {
    console.error("DeepSeek schema test failed:", err);
  }
}

test();
