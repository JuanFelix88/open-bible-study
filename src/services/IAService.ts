import { StaticClass } from "@/entities/StaticClass";

interface IIAResponse {
  response: string;
  poolNode: number;
  poolNodeCount: number;
  agentName: string;
}

export class IAService extends StaticClass {
  public static async request(prompt: string): Promise<IIAResponse> {
    if (!process.env.AI_API_URL) {
      throw new Error("AI_API_URL is not defined");
    }

    const response = await fetch(`${process.env.AI_API_URL}/prompt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch from AI_API_URL");
    }

    const data: IIAResponse = await response.json();
    return data;
  }
}
