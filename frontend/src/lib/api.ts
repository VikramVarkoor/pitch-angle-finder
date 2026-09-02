import type { ApiErrorBody, PitchResponse } from "./types";

// Falls back to localhost for local dev; set NEXT_PUBLIC_API_URL in Vercel
// to point at the deployed Render backend.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function fetchPitchAngles(description: string): Promise<PitchResponse> {
  const response = await fetch(`${API_BASE_URL}/api/pitch-angles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description }),
  });

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as ApiErrorBody;
      if (body.detail) detail = body.detail;
    } catch {
      // response wasn't JSON, keep the generic message
    }
    throw new Error(detail);
  }

  return (await response.json()) as PitchResponse;
}
