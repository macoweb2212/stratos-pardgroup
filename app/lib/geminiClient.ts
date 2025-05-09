import { GenerateContentParameters, GoogleGenAI } from "@google/genai";
import { streamText } from "ai";

export const ai = new GoogleGenAI({ apiKey: "AIzaSyCNH-0agsIcfcYluvDvafVNLKitvtR1-cY" });

class Gemini2_0FlashLite {
    private ai: GoogleGenAI;
    constructor(ai: GoogleGenAI) {
        this.ai = ai;
    }

    generateContent(params: Omit<GenerateContentParameters, "model">) {
        return this.ai.models.generateContent({
            ...params,
            model: "gemini-2.0-flash",
            config: {
                systemInstruction: provaTrainerPrompt,
            },
        });
    }
}

export function createGemini2_0FlashLite(customGoogleAiClient: GoogleGenAI = ai) {
    return new Gemini2_0FlashLite(customGoogleAiClient);
}

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { provaTrainerPrompt } from "./ai/prompt";

const google = createGoogleGenerativeAI({
    apiKey: "AIzaSyCNH-0agsIcfcYluvDvafVNLKitvtR1-cY",
});
