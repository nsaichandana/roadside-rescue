import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
  import.meta.env.VITE_GEMINI_API_KEY
);

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
});

export async function analyzeEmergency(userInput: string) {
  const prompt = `
You are an emergency response AI assistant for road accidents in India.
Analyze this emergency and respond ONLY with valid JSON. No markdown, no extra text, no backticks.

Return exactly this structure:
{
  "severity": "Critical" or "High" or "Moderate" or "Low",
  "call_immediately": "112" or "108" or "100" or "101",
  "immediate_action": "single most important action in one sentence",
  "do": ["action 1", "action 2", "action 3"],
  "dont": ["thing to avoid 1", "thing to avoid 2", "thing to avoid 3"],
  "disclaimer": "This is AI guidance only. Not medically certified. Call emergency services immediately."
}

Rules:
- If two-wheeler or bike mentioned: flag as Critical, first do must be "Do NOT remove helmet"
- If fire mentioned: call_immediately must be "101"
- If police/crime mentioned: call_immediately must be "100"
- If medical/ambulance mentioned: call_immediately must be "108"
- Keep each do/dont item under 10 words
- immediate_action must be under 15 words

Emergency: "${userInput}"
`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    return response;
  } catch (error) {
    console.error("Gemini failed:", error);
    // Return structured fallback
    return JSON.stringify({
      severity: "Unknown",
      call_immediately: "112",
      immediate_action: "Call 112 immediately for emergency assistance.",
      do: [
        "Stay calm and stay at the scene",
        "Call emergency services immediately",
        "Share your live location with contacts",
      ],
      dont: [
        "Panic or leave the victim",
        "Move severely injured persons",
        "Give water to unconscious victims",
      ],
      disclaimer: "AI analysis unavailable. Call 112 immediately for emergency help.",
    });
  }
}