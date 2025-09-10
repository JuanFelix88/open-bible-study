export class ResponseError {
  public static asError(message: (string | Error), status: number = 400) {

    if (message instanceof Error) message = message.message;
    
    return new Response(JSON.stringify({ error: message }), { status });
  }
}
