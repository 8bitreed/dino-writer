const ESCAPE_REGEX = /[&<>"']/g;
const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export type StringBuffer = (string | Promise<string> | number)[];

export type StringBufferCallback = (params: {
  buffer: StringBuffer;
  index: number;
}) => Promise<string> | string | void;

export class HtmlEscapedString extends String {
  readonly isEscaped: true = true;
  callbacks?: StringBufferCallback[];

  constructor(value: unknown, callbacks?: StringBufferCallback[]) {
    super(value ?? "");
    this.callbacks = callbacks;
  }
}

export function escapeToBuffer(str: string, buffer: StringBuffer): void {
  let lastIndex = 0;
  ESCAPE_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = ESCAPE_REGEX.exec(str)) !== null) {
    if (match.index > lastIndex) {
      buffer.push(str.slice(lastIndex, match.index));
    }
    buffer.push(ESCAPE_MAP[match[0]]);
    lastIndex = match.index + 1;
  }

  if (lastIndex === 0) {
    buffer.push(str);
  } else if (lastIndex < str.length) {
    buffer.push(str.slice(lastIndex));
  }
}

export function escapeHtml(str: string): string {
  const buffer: StringBuffer = [];
  escapeToBuffer(str, buffer);
  return buffer.join("");
}

export function isSafeHtml(value: unknown): value is HtmlEscapedString {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { isEscaped?: boolean }).isEscaped === true
  );
}

export function raw(
  value: unknown,
  callbacks?: StringBufferCallback[],
): HtmlEscapedString {
  return new HtmlEscapedString(value ?? "", callbacks);
}

export async function stringBufferToString(
  buffer: StringBuffer,
  callbacks?: StringBufferCallback[],
): Promise<HtmlEscapedString> {
  if (callbacks) {
    for (let i = 0; i < callbacks.length; i++) {
      await callbacks[i]({ buffer, index: buffer.length });
    }
  }

  let str = "";
  for (let i = 0; i < buffer.length; i++) {
    str += await buffer[i];
  }

  return raw(str);
}

function isPromise(value: unknown): value is Promise<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

async function resolveAsyncValue(val: unknown): Promise<string> {
  const resolved = await val;
  if (resolved === null || resolved === undefined || typeof resolved === "boolean") {
    return "";
  }
  if (typeof resolved === "number") {
    return String(resolved);
  }
  if (Array.isArray(resolved)) {
    const leaves = resolved.flat(Infinity);
    let result = "";
    for (let i = 0; i < leaves.length; i++) {
      result += await resolveAsyncValue(leaves[i]);
    }
    return result;
  }
  if (isSafeHtml(resolved)) {
    if (resolved.callbacks && resolved.callbacks.length > 0) {
      const s = await stringBufferToString([resolved.toString()], resolved.callbacks);
      return s.toString();
    }
    return resolved.toString();
  }
  return escapeHtml(typeof resolved === "string" ? resolved : String(resolved));
}

function processLeaf(
  leaf: unknown,
  buffer: StringBuffer,
  callbacks: StringBufferCallback[],
): boolean {
  if (leaf === null || leaf === undefined || typeof leaf === "boolean") {
    return false;
  }
  if (typeof leaf === "number") {
    buffer.push(leaf);
    return false;
  }
  if (isPromise(leaf)) {
    buffer.push(resolveAsyncValue(leaf));
    return true;
  }
  if (isSafeHtml(leaf)) {
    if (leaf.callbacks && leaf.callbacks.length > 0) {
      callbacks.push(...leaf.callbacks);
      buffer.push(leaf.toString());
      return true;
    }
    buffer.push(leaf.toString());
    return false;
  }
  escapeToBuffer(typeof leaf === "string" ? leaf : String(leaf), buffer);
  return false;
}

function processValue(
  value: unknown,
  buffer: StringBuffer,
  callbacks: StringBufferCallback[],
): boolean {
  if (value === null || value === undefined || typeof value === "boolean") {
    return false;
  }
  if (Array.isArray(value)) {
    let hasPromise = false;
    const leaves = value.flat(Infinity);
    for (let i = 0; i < leaves.length; i++) {
      if (processValue(leaves[i], buffer, callbacks)) {
        hasPromise = true;
      }
    }
    return hasPromise;
  }
  return processLeaf(value, buffer, callbacks);
}

type HasPromise<T extends readonly unknown[]> = number extends T["length"]
  ? boolean
  : T extends readonly [infer Head, ...infer Tail]
  ? [Head] extends [Promise<unknown>]
    ? true
    : Head extends readonly unknown[]
    ? HasPromise<Head> extends true
      ? true
      : HasPromise<Tail>
    : HasPromise<Tail>
  : false;

export type HtmlResult<T extends readonly unknown[]> = number extends T["length"]
  ? HtmlEscapedString | Promise<HtmlEscapedString>
  : HasPromise<T> extends true
  ? Promise<HtmlEscapedString>
  : HasPromise<T> extends false
  ? HtmlEscapedString
  : HtmlEscapedString | Promise<HtmlEscapedString>;

export function html<T extends readonly unknown[]>(
  strings: TemplateStringsArray,
  ...values: T
): HtmlResult<T>;
export function html(
  strings: TemplateStringsArray,
  ...values: unknown[]
): HtmlEscapedString | Promise<HtmlEscapedString> {
  const buffer: StringBuffer = [];
  const callbacks: StringBufferCallback[] = [];
  let hasPromise = false;

  for (let i = 0; i < strings.length; i++) {
    buffer.push(strings[i]);
    if (i < values.length) {
      if (processValue(values[i], buffer, callbacks)) {
        hasPromise = true;
      }
    }
  }

  if (hasPromise || callbacks.length > 0) {
    return stringBufferToString(buffer, callbacks.length > 0 ? callbacks : undefined);
  }

  return raw(buffer.join(""));
}
