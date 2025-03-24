import StreamingAvatar from "@heygen/streaming-avatar";
import { NextRequest } from "next/server";

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;

export async function POST(req: NextRequest) {
  try {

    const body = await req.json();

    const bearerHeader = req.headers.get("Authorization");
    if (bearerHeader == null) throw new Error('not authorized')
        
    const response = await fetch(
        "https://api.heygen.com/v1/streaming.new",
        {
          method: "POST",
          headers: {
            Authorization: bearerHeader,
            "x-api-key": HEYGEN_API_KEY!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            avatar_name: body.avatarName,
            quality: body.quality,
            knowledge_base_id: body.knowledgeId,
            knowledge_base: body.knowledgeBase,
            voice: {
              voice_id: body.voice?.voiceId,
              rate: body.voice?.rate,
              emotion: body.voice?.emotion,
              elevenlabs_settings: body?.voice?.elevenlabsSettings,
            },
            language: body.language,
            version: 'v2',
            video_encoding: 'H264',
            source: 'sdk',
            disable_idle_timeout: body.disableIdleTimeout,
          })
        },
      );
      const jsonData = await response.json();
    return new Response(JSON.stringify(jsonData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error creating session:", error);

    return new Response("Failed to create session", {
      status: 500,
    });
  }
}
