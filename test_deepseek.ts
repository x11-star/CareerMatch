import dotenv from "dotenv";

dotenv.config();

const MATCH_SCHEMA = {
  type: "object",
  required: [
    "resumeMatch",
    "personalityMatch",
    "overallMatch",
    "resumeMatchExplanation",
    "personalityMatchExplanation",
    "whyExcellent"
  ],
  properties: {
    resumeMatch: { type: "integer" },
    personalityMatch: { type: "integer" },
    overallMatch: { type: "integer" },
    resumeMatchExplanation: { type: "string" },
    personalityMatchExplanation: { type: "string" },
    whyExcellent: { type: "string" }
  }
};

async function test() {
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  console.log("DeepSeek API Key exists:", !!deepseekKey);
  if (!deepseekKey) return;

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
          { role: "system", content: "You are an expert HR assistant. You always respond with pure JSON." },
          { role: "user", content: "Please evaluate matching for Name: Alice, School: Nanjing Agricultural Univ, Major: Information Resource Management, Applying to: Aerospace Systems Engineer at China Railway. Output JSON conforming to schema." }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2
      })
    });

    console.log("DeepSeek Status:", response.status);
    const data = await response.json();
    console.log("DeepSeek Response:", JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error("DeepSeek test failed:", err);
  }
}

test();
