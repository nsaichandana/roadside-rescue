import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
  import.meta.env.VITE_GEMINI_API_KEY
);

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
});

export async function analyzeEmergency(userInput: string) {
  const prompt = `
You are an emergency response AI assistant for road emergencies in India.
Analyze this emergency and respond ONLY with valid JSON. No markdown, no extra text, no backticks.

Return exactly this structure:
{
  "emergency_type": "Medical Emergency" or "Vehicle Breakdown" or "Fire Emergency" or "Security Emergency" or "General Emergency",
  "severity": "Critical" or "High" or "Moderate" or "Low",
  "call_immediately": "112" or "108" or "100" or "101",
  "immediate_action": "single most important action in one sentence",
  "do": ["action 1", "action 2", "action 3"],
  "dont": ["thing to avoid 1", "thing to avoid 2", "thing to avoid 3"],
  "disclaimer": "This is AI guidance only. Not medically certified. Call emergency services immediately."
}

Classification rules for emergency_type:
- "Medical Emergency": injury, bleeding, unconscious, heart attack, ambulance needed, person hurt
- "Vehicle Breakdown": flat tire, engine failure, car won't start, towing needed, puncture, battery dead
- "Fire Emergency": fire, smoke, flames, burning vehicle or building
- "Security Emergency": robbery, theft, locked out, assault, crime, police needed, danger from person
- "General Emergency": accident without clear injury, unclear situation

Number rules:
- If fire mentioned: call_immediately must be "101"
- If police/crime/robbery/locked out mentioned: call_immediately must be "100"
- If medical/ambulance/injury mentioned: call_immediately must be "108"
- Default: "112"

Other rules:
- If two-wheeler or bike mentioned: severity must be "Critical", first do must be "Do NOT remove helmet"
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
    return JSON.stringify({
      emergency_type: "General Emergency",
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