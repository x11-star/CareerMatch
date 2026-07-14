import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

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

async function test() {
  console.log("Checking GEMINI_API_KEY presence:", !!process.env.GEMINI_API_KEY);
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "Testing connection. Reply with a simple hello.",
    });
    console.log("Basic connection test response:", response.text);
    
    console.log("Testing with MATCH_SCHEMA...");
    const responseSchemaTest = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "Analyze a fake candidate matching. Name: Alice, Major: Humanities, Applying to: Software Engineer.",
      config: {
        responseMimeType: "application/json",
        responseSchema: MATCH_SCHEMA
      }
    });
    console.log("Schema test response:", responseSchemaTest.text);
  } catch (err: any) {
    console.error("TEST FAILED WITH ERROR:", err);
  }
}

test();
