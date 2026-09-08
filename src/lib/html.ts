const ESCAPE_REGEX = /[&<>"']/g;
const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export const IS_SAFE_HTML = Symbol("IS_SAFE_HTML");

export class HtmlEscapedString {
  readonly [IS_SAFE_HTML] = true;
  readonly value: string;

  constructor(value: string) {
    this.value = value;
  }

  toString(): string {
    return this.value;
  }

  valueOf(): string {
    return this.value;
  }
}

export function escapeHtml(str: string): string {
  return str.replace(ESCAPE_REGEX, (match) => ESCAPE_MAP[match]);
}

export function isSafeHtml(value: unknown): value is HtmlEscapedString {
  return typeof value === "object" && value !== null && IS_SAFE_HTML in value;
}

export function raw(value: unknown): HtmlEscapedString {
  return new HtmlEscapedString(String(value ?? ""));
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined || value === false) {
    return "";
  }
  if (Array.isArray(value)) {
    return value.map(stringifyValue).join("");
  }
  if (isSafeHtml(value)) {
    return value.value;
  }
  return escapeHtml(String(value));
}

export function html(
  strings: TemplateStringsArray,
  ...values: unknown[]
): HtmlEscapedString {
  let result = strings[0];
  for (let i = 0; i < values.length; i++) {
    result += stringifyValue(values[i]);
    result += strings[i + 1];
  }
  return new HtmlEscapedString(result);
}
