// AI Classification service using Google Gemini API
import { getGeminiErrorMessage } from "@/lib/gemini-errors"

export interface ClassificationInput {
  title: string;
  plot?: string;
  genres?: string[];
  year?: string;
  type?: string; // Movie or TV Show
}

export interface ClassificationOutput {
  content_type?: string; // Documentary, Animation, Scripted Live Action, etc.
  medium?: string; // Movie, TV Show refinement
  suggested_genres?: string[];
}

export async function classifyWithGemini(
  input: ClassificationInput,
  apiKey: string
): Promise<ClassificationOutput | null> {
  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const prompt = `You are a media classification expert. Based on the following information, classify this ${input.type || "media"}:

Title: ${input.title}
${input.year ? `Year: ${input.year}` : ""}
${input.plot ? `Plot: ${input.plot}` : ""}
${input.genres && input.genres.length > 0 ? `Genres: ${input.genres.join(", ")}` : ""}

Please provide a JSON response with the following fields (only include fields where you're confident):
- content_type: Choose ONE from: "Documentary", "Animation", "Scripted Live Action", "Reality", "Variety", "Special", "Audio"
- medium: If needed, refine to "Movie", "TV Show", "Theatre", "Live Theatre", "Podcast"
- suggested_genres: Array of relevant genres if you can improve on the provided ones

Return ONLY valid JSON, no markdown or explanation.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Try to parse JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Gemini response not valid JSON:", text);
      return null;
    }

    const classification = JSON.parse(jsonMatch[0]);
    return classification;
  } catch (error) {
    console.error("Gemini classification error:", getGeminiErrorMessage(error), error);
    return null;
  }
}
