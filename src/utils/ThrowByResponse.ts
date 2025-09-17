import { StaticClass } from "@/entities/StaticClass";

export class ThrowByResponse extends StaticClass {
  public static async throwsIfNotOk(response: Response) {
    if (!response.ok) {
      const { message } = response.json() as Record<string, any>;

      if (message && typeof message === "string") {
        throw new Error(message);
      }

      throw new Error(
        `Error when fetching (${response.url}): ${response.status}`
      );
    }
  }
}
