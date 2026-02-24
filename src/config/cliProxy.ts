import { ResponseError } from "@/utils/ResponseError";

export interface CLIProxyConfig {
  apiUrl: string;
  apiKey: string;
  model?: string;
}

export function getCLIProxyConfigOrError(): CLIProxyConfig | Response {
  if (!process.env.CLI_PROXY_HOST) {
    return ResponseError.asError("CLI_PROXY_HOST is not defined", 400);
  }
  if (!process.env.CLI_PROXY_KEY) {
    return ResponseError.asError("CLI_PROXY_KEY is not defined", 400);
  }

  return {
    apiUrl: process.env.CLI_PROXY_HOST,
    apiKey: process.env.CLI_PROXY_KEY,
    model: process.env.CLI_PROXY_MODEL,
  };
}
