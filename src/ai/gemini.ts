import {
    GoogleGenerativeAI,
  } from "@google/generative-ai";
  
  const genAI =
    new GoogleGenerativeAI(
      import.meta.env
        .VITE_GEMINI_API_KEY
    );
  
  const model =
    genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
    });
  
  export async function analyzeEmergency(
    userInput: string
  ) {
    const prompt = `
  You are an emergency response AI assistant.
  
  Analyze the user's emergency situation.
  
  Return:
  1. Emergency type
  2. Severity level
  3. Immediate dangers
  4. Immediate actions
  5. Nearby services required
  
  User input:
  "${userInput}"
  
  Keep response concise and practical.
  `;
  
    const result =
      await model.generateContent(
        prompt
      );
  
    const response =
      result.response.text();
  
    return response;
  }