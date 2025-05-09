import { ContentListUnion } from "@google/genai";

export async function streamResponse(chatHistory: ContentListUnion) {
    try {
        const response = await fetch("/api/chat/stream-response", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chatHistory }),
        });
        if (!response.body) throw new Error("No response body");

        return response.body.getReader();
    } catch (error) {
        console.error("Error fetching stream response:", error);
        throw error;
    }
}
