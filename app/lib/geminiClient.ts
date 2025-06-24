import { GenerateContentParameters, GoogleGenAI } from "@google/genai";
import { streamText } from "ai";
import { promptUnificato } from "./ai/prompt";
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
                systemInstruction: promptUnificato,
                tools: [{ urlContext: {} }],
            },
        });
    }
}

export function createGemini2_0FlashLite(customGoogleAiClient: GoogleGenAI = ai) {
    return new Gemini2_0FlashLite(customGoogleAiClient);
}

import { createGoogleGenerativeAI } from "@ai-sdk/google";

export const google = createGoogleGenerativeAI({
    apiKey: "AIzaSyCNH-0agsIcfcYluvDvafVNLKitvtR1-cY",
});
