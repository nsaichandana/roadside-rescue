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

let geminiQuotaExceeded = false;

export async function analyzeEmergency(
  userInput: string,
  country?: CountryEmergency,
): Promise<string> {
  const c = country ?? getCountryEmergencySync();

  if (geminiQuotaExceeded) {
    console.warn("Gemini quota exceeded — using fallback directly");
    return getFallbackResponse(c, userInput);
  }

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
  } catch (error: any) {
    console.error("Gemini failed:", error);
    if (error?.message?.includes("429") || error?.message?.includes("quota")) {
      geminiQuotaExceeded = true;
    }
    return getFallbackResponse(c, userInput);
  }
}

function getFallbackResponse(c: CountryEmergency, userInput: string): string {
  const input = userInput.toLowerCase();

  let emergency_type = "General Emergency";
  let severity = "High";
  let call_immediately = c.allEmergency;
  let immediate_action = `Call ${c.allEmergency} immediately for emergency assistance.`;

  if (input.match(/heart|chest|breath|unconscious|faint|stroke|bleed|injur/)) {
    emergency_type = "Medical Emergency";
    severity = "Critical";
    call_immediately = c.ambulance;
    immediate_action = "Call ambulance immediately and keep patient still.";
  } else if (input.match(/fire|smoke|burn|flame/)) {
    emergency_type = "Fire Emergency";
    severity = "Critical";
    call_immediately = c.fire;
    immediate_action = "Move away from fire and call fire services immediately.";
  } else if (input.match(/rob|theft|assault|attack|crime|stolen|danger/)) {
    emergency_type = "Security Emergency";
    severity = "High";
    call_immediately = c.police;
    immediate_action = "Move to a safe location and call police immediately.";
  } else if (input.match(/tire|tyre|puncture|breakdown|engine|battery|tow|mechanic/)) {
    emergency_type = "Vehicle Breakdown";
    severity = "Moderate";
    call_immediately = c.highway ?? c.allEmergency;
    immediate_action = "Move vehicle to road shoulder and turn on hazard lights.";
  }

  const isTwoWheeler = !!input.match(/bike|motorcycle|scooter|two.?wheel/);
  if (isTwoWheeler) severity = "Critical";

  return JSON.stringify({
    emergency_type,
    severity,
    call_immediately,
    immediate_action,
    do: getDo(emergency_type, isTwoWheeler),
    dont: getDont(emergency_type, isTwoWheeler),
    disclaimer: `Offline emergency guidance. Call ${call_immediately} immediately.`,
  });
}

function getDo(type: string, isTwoWheeler: boolean): string[] {
  const base: Record<string, string[]> = {
    "Medical Emergency": ["Call ambulance immediately", "Keep patient calm and still", "Monitor breathing"],
    "Fire Emergency": ["Evacuate the area immediately", "Call fire services", "Stay low if there is smoke"],
    "Security Emergency": ["Move to a safe public area", "Call police immediately", "Note attacker description"],
    "Vehicle Breakdown": ["Turn on hazard lights", "Move to road shoulder", "Stay behind crash barrier"],
    "General Emergency": ["Stay calm and stay at the scene", "Call emergency services", "Share your live location"],
  };
  const actions = [...(base[type] ?? base["General Emergency"])];
  if (isTwoWheeler) actions.unshift("Do NOT remove the helmet");
  return actions.slice(0, 3);
}

function getDont(type: string, isTwoWheeler: boolean): string[] {
  const base: Record<string, string[]> = {
    "Medical Emergency": ["Do not move severely injured persons", "Do not give water to unconscious victims", "Do not panic"],
    "Fire Emergency": ["Do not re-enter burning vehicle", "Do not use water on electrical fire", "Do not panic"],
    "Security Emergency": ["Do not confront the attacker", "Do not share location publicly", "Do not panic"],
    "Vehicle Breakdown": ["Do not stop in middle of road", "Do not stand behind the vehicle", "Do not leave without hazard lights"],
    "General Emergency": ["Do not panic", "Do not leave the victim", "Do not move severely injured persons"],
  };
  const actions = [...(base[type] ?? base["General Emergency"])];
  if (isTwoWheeler) actions.unshift("Do not remove the helmet");
  return actions.slice(0, 3);
}