import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/v2/core"; // FIX: Import defineSecret for v2 functions
import { GoogleGenAI, Type } from "@google/genai";

// FIX: Define the secret using defineSecret. This declares the secret to Firebase.
// The value will be available in process.env.GEMINI_API_KEY at runtime.
const GEMINI_API_KEY_SECRET = defineSecret("GEMINI_API_KEY");

let ai: GoogleGenAI;

// FIX: Use onRequest from v2 and pass secrets in the options object.
export const generateAIResponse = onRequest(
  { 
    // Specify the secrets required by this function.
    // Firebase will ensure process.env.GEMINI_API_KEY is available.
    secrets: [GEMINI_API_KEY_SECRET] 
  },
  async (req, res) => {
    // Set CORS headers for preflight and actual requests
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY not set in environment variables.");
      res.status(500).json({ error: "Server configuration error: Gemini API Key is missing. Please set GEMINI_API_KEY secret." });
      return;
    }

    if (!ai) {
      ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }

    try {
      const { content, promptType } = req.body;

      if (!content || !promptType) {
        res.status(400).json({ error: "Missing 'content' or 'promptType' in request body." });
        return;
      }

      let geminiModel: string;
      let modelConfig: any = {};
      let fullPrompt = content;

      switch (promptType) {
        case 'study_buddy':
          geminiModel = 'gemini-2.5-flash';
          modelConfig = { systemInstruction: "You are a helpful AI study buddy, powered by Google Gemini. Provide clear, concise, and accurate information related to academic subjects. Avoid making things up." };
          break;
        case 'syllabus_structure':
          geminiModel = 'gemini-3-pro-preview'; // Complex text task
          fullPrompt = `
            Parse the following syllabus text and convert it into a structured JSON object.
            The JSON object must have a single root key called "units".
            The "units" key must be an array of objects.
            Each object in the "units" array must have the following keys: "title" (string), and "topics" (array of strings).
            Your entire response must be ONLY the raw JSON object, without any surrounding text or markdown code fences.

            Syllabus Text:
            ---
            ${content}
            ---
            `;
            modelConfig = {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        units: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    topics: {
                                        type: Type.ARRAY,
                                        items: { type: Type.STRING }
                                    },
                                },
                                required: ["title", "topics"]
                            },
                        },
                    },
                    required: ["units"],
                },
                systemInstruction: "You are a helpful assistant that structures academic syllabus into a JSON format."
            };
          break;
        case 'notes_generation':
            geminiModel = 'gemini-3-pro-preview'; // Complex text task
            fullPrompt = `Generate detailed, student-friendly study notes for the topic '${content}' as clean HTML. Use tags like <h2> for headings, <p> for paragraphs, <strong> for emphasis, and <ul>/<li> for lists. Include definitions, examples, formulas, key concepts, and real-world connections. Do not include any markdown or plain text outside of the HTML structure. Your entire response should be a single block of HTML.`;
            modelConfig = {
                responseMimeType: "text/html",
                systemInstruction: "You are an expert educator that writes clear and comprehensive study notes in HTML."
            };
            break;
        case 'quiz_generation':
            geminiModel = 'gemini-3-pro-preview'; // Complex text task
            fullPrompt = `From the following notes, create 5 multiple-choice questions. For each question return JSON with: {"question": "...", "options": ["...","...","...","..."], "answerIndex": 1, "explanation": "Explain why the answer is correct and why the wrong options are wrong (brief)."}. Return ONLY a valid JSON array of these objects, nothing else.
            
            Notes:
            ---
            ${content}
            ---
            `;
            modelConfig = {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            question: { type: Type.STRING },
                            options: { type: Type.ARRAY, items: { type: Type.STRING } },
                            answerIndex: { type: Type.NUMBER },
                            explanation: { type: Type.STRING },
                        },
                        required: ["question", "options", "answerIndex", "explanation"]
                    }
                },
                systemInstruction: "You are an expert quiz master. Create high-quality multiple-choice quizzes based on provided content."
            };
            break;
        default:
          res.status(400).json({ error: "Invalid 'promptType' provided." });
          return;
      }

      const response = await ai.models.generateContent({
        model: geminiModel,
        contents: [{ parts: [{ text: fullPrompt }] }],
        config: modelConfig,
      });

      const responseText = response.text;

      if (!responseText) {
        console.error("Gemini API returned no text content.", response);
        res.status(500).json({ error: "Gemini API returned an empty response." });
        return;
      }

      res.status(200).json({ content: responseText });

    } catch (error: any) {
      console.error("Gemini API call error:", error);
      // More detailed error for debugging:
      const errorMessage = error.message || "An unexpected error occurred with the Gemini API.";
      res.status(500).json({ error: errorMessage });
    }
  });