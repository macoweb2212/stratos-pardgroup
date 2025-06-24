import { promptUnificato } from "@/app/lib/ai/prompt";
import { google } from "@/app/lib/geminiClient";
import { CoreMessage, streamText } from "ai";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
    const body = await req.json();
    const chatHistory: CoreMessage[] = body.chatHistory;

    if (!chatHistory) {
        return new Response(JSON.stringify({ error: "Missing chatHistory" }), { status: 400 });
    }

    const result = await streamText({
        messages: chatHistory,
        system: promptUnificato,
        //@ts-ignore
        model: google("gemini-2.0-flash-lite"),
    });

    return result.toTextStreamResponse();
}
