// components/utils.ts

type AIResponse = {
  success: boolean;
  content?: string;
  error?: string;
};

// IMPORTANT: Replace `YOUR_FIREBASE_PROJECT_ID` with your actual Firebase project ID.
// This URL points to your deployed Cloud Function.
const FIREBASE_FUNCTION_URL = "https://YOUR_FIREBASE_PROJECT_ID.cloudfunctions.net/generateAIResponse";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function fetchAIResponse(
    content: string,
    promptType: 'study_buddy' | 'syllabus_structure' | 'notes_generation' | 'quiz_generation',
    retries: number = 2
): Promise<AIResponse> {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(FIREBASE_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: content,
          promptType: promptType,
        }),
      });

      if (!response.ok) {
          const errorBody = await response.text();
          console.error(`Firebase Function call failed (attempt ${i+1}):`, response.status, errorBody);
          if (i === retries) {
            return { success: false, error: `AI service (via Cloud Function) returned an error: ${errorBody}` };
          }
          await sleep(1000 * (i + 1)); // Exponential backoff
          continue;
      }

      const data = await response.json();
      let responseContent = data?.content?.trim();

      if (!responseContent) {
        console.error("Cloud Function returned no AI output. Full response:", data);
        if (i === retries) {
            return { success: false, error: "AI (via Cloud Function) returned an empty response." };
        }
        await sleep(1000 * (i + 1));
        continue;
      }
      
      // The Cloud Function now handles JSON response types using responseSchema.
      // We just return the content as received. Callers will parse JSON if expected.

      return { success: true, content: responseContent };

    } catch (error: any) {
      console.error(`AI Error (attempt ${i+1}):`, error);
      if (i === retries) {
        return { success: false, error: "⚠️ AI service (via Cloud Function) unavailable. Please try again later." };
      }
      await sleep(1000 * (i + 1));
    }
  }
  return { success: false, error: "An unexpected error occurred after all retries." };
}