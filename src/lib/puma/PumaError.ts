export class PumaError extends Error {
  response?: Response;
  text?: string;
  status?: number;
  statusText?: string;
  contentType?: string;

  constructor(message: string, response?: Response, text?: string) {
    super(message);
    this.name = "PumaError";
    this.response = response;
    this.text = text;
    if (response) {
      this.status = response.status;
      this.statusText = response.statusText;
      this.contentType = response.headers.get("content-type") || "";
    }
  }
}
