import StreamingAvatar from "@heygen/streaming-avatar";
import { NextRequest } from "next/server";

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;

export async function POST(req: NextRequest) {
  try {

    const body = await req.json();

    const bearerHeader = req.headers.get("Authorization");
    if (bearerHeader == null) throw new Error('not authorized')
        
    const response = await fetch(
        "https://api.heygen.com/v1/streaming.stop_listening",
        {
          method: "POST",
          headers: {
            Authorization: bearerHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body)
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
    console.error("Error stopping session:", error);

    return new Response("Failed to stop session", {
      status: 500,
    });
  }
}
