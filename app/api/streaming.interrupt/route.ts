import StreamingAvatar from "@heygen/streaming-avatar";
import { NextRequest } from "next/server";

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;

export async function POST(req: NextRequest) {
  try {

    const body = await req.json();

    const response = await fetch(
        "https://api.heygen.com/v1/streaming.interrupt",
        {
          method: "POST",
          headers: {
            "x-api-key": HEYGEN_API_KEY!,
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
