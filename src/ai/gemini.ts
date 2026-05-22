import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  type CountryEmergency,
  getCountryEmergencySync,
} from "@/utils/countryEmergency";

const genAI = new GoogleGenerativeAI(
  import.meta.env.VITE_GEMINI_API_KEY
);

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
});

/**
 * Analyze an emergency situation and return structured JSON guidance.
 *
 * @param userInput   Free-text description of the emergency.
 * @param country     Resolved CountryEmergency profile. Falls back to
 *                    the synchronous cache (→ India default if uncached).
 */
export async function analyzeEmergency(
  userInput: string,
  country?: CountryEmergency,
): Promise<string> {
  const c = country ?? getCountryEmergencySync();

  // Build a country-specific number list for the prompt so Gemini picks correctly.
  const numberContext = [
    `All-purpose emergency: ${c.allEmergency}`,
    `Ambulance: ${c.ambulance}`,
    `Police: ${c.police}`,
    `Fire: ${c.fire}`,
    c.highway ? `Highway / Roadside help: ${c.highway}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const prompt = `
You are an emergency response AI assistant for road emergencies.
The user is currently in ${c.countryName}.
Emergency numbers for this country: ${numberContext}.

Analyze this emergency and respond ONLY with valid JSON. No markdown, no extra text, no backticks.

Return exactly this structure:
{
  "emergency_type": "Medical Emergency" or "Vehicle Breakdown" or "Fire Emergency" or "Security Emergency" or "General Emergency",
  "severity": "Critical" or "High" or "Moderate" or "Low",
  "call_immediately": "<the single most relevant emergency number from those listed above>",
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

Number selection rules (always choose from the country's numbers listed above):
- If fire mentioned: use the fire number
- If police/crime/robbery/assault mentioned: use the police number
- If medical/ambulance/injury/unconscious mentioned: use the ambulance number
- If vehicle breakdown with no injury: use the highway/roadside number if available, else all-purpose
- Default: use the all-purpose emergency number

Other rules:
- If two-wheeler or bike mentioned: severity must be "Critical", first do must be "Do NOT remove helmet"
- Keep each do/dont item under 10 words
- immediate_action must be under 15 words

Emergency: "${userInput}"
`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Gemini failed:", error);
    return JSON.stringify({
      emergency_type: "General Emergency",
      severity: "Unknown",
      call_immediately: c.allEmergency,
      immediate_action: `Call ${c.allEmergency} immediately for emergency assistance.`,
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
      disclaimer: `AI analysis unavailable. Call ${c.allEmergency} immediately for emergency help.`,
    });
  }
}