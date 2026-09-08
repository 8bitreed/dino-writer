/**
 * Puma — tiny progressive HTML fetcher
 *
 * Directives:
 * - data-puma="get|post|put|delete|submit" -> action to take (forms default to submit)
 * - data-puma-target="#id .selector"      -> CSS selector for element to swap into
 * - data-puma-swap="inner|outer"          -> how to swap returned HTML (default: inner)
 * - data-puma-confirm="Are you sure?"     -> prompt confirmation before sending
 * - data-puma-params="key=value"          -> params to send for non-GET requests
 * - data-puma-loader                      -> opt-in spinner on trigger element
 * - data-puma-loader="skeleton"           -> show skeleton placeholders in target
 * - data-puma-loader="both"               -> show both spinner and skeletons
 *
 * Events:
 * - puma:before      -> before action starts (cancelable)
 * - puma:beforeSend  -> before request is sent (cancelable, mutable url/method/headers/body)
 * - puma:success     -> on successful response (cancelable to prevent DOM mutation)
 * - puma:error       -> on request or network error
 * - puma:after       -> after request finishes (success or error)
 */

export interface PumaInitOptions {
  headers?: Record<string, string>;
}

export interface PumaRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: BodyInit | null;
  credentials?: RequestCredentials;
  redirect?: RequestRedirect;
}

export interface PumaResponse {
  ok: boolean;
  status: number;
  statusText: string;
  text: string;
  response: Response;
  headers: Record<string, string>;
}

export class PumaRequestError extends Error {
  puma: PumaResponse;

  constructor(message: string, puma: PumaResponse) {
    super(message);
    this.name = "PumaRequestError";
    this.puma = puma;
  }
}

export interface PumaBeforeEventDetail {
  event?: Event;
}

export interface PumaBeforeSendEventDetail {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: BodyInit | null;
}

export interface PumaSuccessEventDetail {
  text: string;
  target: Element | null;
  swap: string;
}

export interface PumaErrorEventDetail {
  error: unknown;
}

export interface PumaLoader {
  show(element: Element | null): void;
  hide(element: Element | null): void;
  showSkeleton(targetElement: Element | null): void;
  hideSkeleton(targetElement: Element | null): void;
  hideAll(): void;
}

export interface Puma {
  init(opts?: PumaInitOptions): void;
  request(url: string, opts?: PumaRequestOptions): Promise<PumaResponse>;
  bind(el: Element | null): void;
  scan(root?: ParentNode): void;
  onBeforeFetch: ((fetchOptions: RequestInit, url: string) => void) | null;
  loader: PumaLoader;
}

const defaultHeaders: Record<string, string> = {
  "X-Puma": "true",
  Accept: "text/html, */*;q=0.1",
};

const boundElements = new WeakSet<Element>();
let observer: MutationObserver | null = null;

function qs<T extends Element = Element>(
  root: ParentNode | null | undefined,
  selector: string,
): T | null {
  if (!selector) return null;
  const target = root ?? (typeof document !== "undefined" ? document : null);
  return target?.querySelector<T>(selector) ?? null;
}

function qsa<T extends Element = Element>(
  selector: string,
  root?: ParentNode | null,
): T[] {
  const target = root ?? (typeof document !== "undefined" ? document : null);
  return target ? Array.from(target.querySelectorAll<T>(selector)) : [];
}

function triggerEvent<T = unknown>(
  target: EventTarget,
  name: string,
  detail: T,
): CustomEvent<T> {
  const ev = new CustomEvent<T>(name, {
    detail,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(ev);
  return ev;
}

function buildUrlWithParams(url: string, params: string): string {
  if (!params) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${params}`;
}

function injectCSS(): void {
  if (typeof document === "undefined") return;
  const styleId = "puma-loader-styles";
  if (document.getElementById(styleId)) return;

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    :root {
      --puma-skeleton-bg: #e0e0e0;
      --puma-skeleton-shimmer: #f0f0f0;
    }

    html[data-theme="dark"] {
      --puma-skeleton-bg: #404040;
      --puma-skeleton-shimmer: #505050;
    }

    @media (prefers-color-scheme: dark) {
      html:not([data-theme="light"]) {
        --puma-skeleton-bg: #404040;
        --puma-skeleton-shimmer: #505050;
      }
    }

    .puma-loader {
      display: inline-flex;
      align-items: center;
      margin-right: 0.5rem;
    }

    .puma-spinner {
      display: inline-block;
      width: 1em;
      height: 1em;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: puma-spin 0.6s linear infinite;
    }

    @keyframes puma-spin {
      to {
        transform: rotate(360deg);
      }
    }

    .puma-skeleton {
      background: linear-gradient(
        90deg,
        var(--puma-skeleton-bg) 0%,
        var(--puma-skeleton-shimmer) 50%,
        var(--puma-skeleton-bg) 100%
      );
      background-size: 200% 100%;
      border-radius: 0.25rem;
      animation: puma-shimmer 2s ease-in-out infinite;
    }

    @keyframes puma-shimmer {
      0% {
        background-position: 200% 0%;
      }
      50% {
        background-position: -200% 0%;
      }
      100% {
        background-position: 200% 0%;
      }
    }
  `;
  document.head.appendChild(style);
}

function createLoaderElement(): HTMLSpanElement {
  const span = document.createElement("span");
  span.className = "puma-loader";
  span.setAttribute("aria-label", "Loading");

  const spinner = document.createElement("span");
  spinner.className = "puma-spinner";
  span.appendChild(spinner);

  return span;
}

function createSkeletonForElement(el: Element): HTMLElement {
  const skeleton = document.createElement("div");
  skeleton.className = "puma-skeleton";
  skeleton.setAttribute("data-puma-skeleton", "true");

  if (typeof globalThis.getComputedStyle === "function") {
    const style = globalThis.getComputedStyle(el);
    skeleton.style.height = style.height;
    skeleton.style.width = style.width;
    skeleton.style.margin = style.margin;
    skeleton.style.padding = "0";
    skeleton.style.display = style.display;
  }

  return skeleton;
}

export const loader: PumaLoader = {
  show(element: Element | null): void {
    if (!element) return;
    injectCSS();
    if (element.querySelector(".puma-loader")) return;

    const loaderEl = createLoaderElement();
    element.insertBefore(loaderEl, element.firstChild);
    element.setAttribute("disabled", "disabled");
  },

  hide(element: Element | null): void {
    if (!element) return;
    const loaderEl = element.querySelector(".puma-loader");
    if (loaderEl) {
      loaderEl.remove();
      element.removeAttribute("disabled");
    }
  },

  showSkeleton(targetElement: Element | null): void {
    if (!targetElement) return;
    injectCSS();

    targetElement.setAttribute("data-puma-has-skeletons", "true");
    const children = Array.from(targetElement.children);
    for (const child of children) {
      const skeleton = createSkeletonForElement(child);
      targetElement.replaceChild(skeleton, child);
    }
  },

  hideSkeleton(targetElement: Element | null): void {
    if (!targetElement) return;
    targetElement.removeAttribute("data-puma-has-skeletons");

    const skeletons = qsa('[data-puma-skeleton="true"]', targetElement);
    for (const skeleton of skeletons) {
      if (skeleton.parentNode === targetElement) {
        skeleton.remove();
      }
    }
  },

  hideAll(): void {
    if (typeof document === "undefined") return;
    const loaders = qsa(".puma-loader", document);
    for (const loaderEl of loaders) {
      const parentEl = loaderEl.parentElement;
      if (parentEl) {
        this.hide(parentEl);
      }
    }
  },
};

export async function request(
  url: string,
  opts?: PumaRequestOptions,
): Promise<PumaResponse> {
  const options = opts ?? {};
  const method = (options.method ?? "GET").toUpperCase();
  const headers: Record<string, string> = {
    ...defaultHeaders,
    ...(options.headers ?? {}),
  };
  const body = options.body;

  if (body && typeof body === "string" && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8";
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
    credentials: options.credentials ?? "same-origin",
    redirect: options.redirect ?? "follow",
  };

  if (method !== "GET" && method !== "HEAD" && body !== undefined && body !== null) {
    fetchOptions.body = body;
  }

  if (typeof puma.onBeforeFetch === "function") {
    try {
      puma.onBeforeFetch(fetchOptions, url);
    } catch (e) {
      console.error("puma.onBeforeFetch handler error", e);
    }
  }

  const res = await fetch(url, fetchOptions);
  const text = await res.text();

  const responseHeaders: Record<string, string> = {};
  res.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  const result: PumaResponse = {
    ok: res.ok,
    status: res.status,
    statusText: res.statusText,
    text,
    response: res,
    headers: responseHeaders,
  };

  if (!res.ok) {
    throw new PumaRequestError(`Request failed: ${res.status} ${res.statusText}`, result);
  }

  return result;
}

function swapHtml(targetEl: Element, html: string, swap = "inner"): void {
  if (swap === "outer") {
    const template = document.createElement("template");
    template.innerHTML = html.trim();
    const parent = targetEl.parentNode;
    if (parent && template.content.childNodes.length > 0) {
      parent.replaceChild(template.content, targetEl);
    } else {
      targetEl.innerHTML = html;
    }
  } else {
    targetEl.innerHTML = html;
  }
}

function handleResponseForElement(triggerEl: Element, resText: string): void {
  const targetSelector = triggerEl.getAttribute("data-puma-target");
  const swap = triggerEl.getAttribute("data-puma-swap") || "inner";
  const targetEl = targetSelector ? qs(document, targetSelector) : triggerEl;

  const successEv = triggerEvent<PumaSuccessEventDetail>(triggerEl, "puma:success", {
    text: resText,
    target: targetEl,
    swap,
  });

  if (successEv.defaultPrevented) return;

  if (targetEl) swapHtml(targetEl, resText, swap);
}

async function handleAction(triggerEl: Element, event?: Event): Promise<void> {
  const beforeEv = triggerEvent<PumaBeforeEventDetail>(triggerEl, "puma:before", { event });
  if (beforeEv.defaultPrevented) return;

  const loaderAttr = triggerEl.getAttribute("data-puma-loader");
  const hasLoader = loaderAttr !== null;
  const loaderMode: "spinner" | "skeleton" | "both" = loaderAttr === "skeleton"
    ? "skeleton"
    : loaderAttr === "both"
    ? "both"
    : "spinner";

  const targetSelector = triggerEl.getAttribute("data-puma-target");
  const targetEl = targetSelector ? qs(document, targetSelector) : null;

  let method = (
    triggerEl.getAttribute("data-puma-method") ||
    triggerEl.getAttribute("method") ||
    "GET"
  ).toUpperCase();

  let url = triggerEl.getAttribute("data-puma-url") ||
    triggerEl.getAttribute("action") ||
    triggerEl.getAttribute("href") ||
    (typeof globalThis.location !== "undefined" ? globalThis.location.href : "");

  const confirmText = triggerEl.getAttribute("data-puma-confirm");
  if (
    confirmText &&
    typeof globalThis.confirm === "function" &&
    !globalThis.confirm(confirmText)
  ) {
    return;
  }

  let body: BodyInit | null = null;
  let headers: Record<string, string> = {};
  let eventTarget: Element = triggerEl;

  if (triggerEl.tagName === "FORM" || triggerEl.getAttribute("data-puma") === "submit") {
    event?.preventDefault();
    const form = triggerEl instanceof HTMLFormElement
      ? triggerEl
      : triggerEl.closest("form") ?? qs<HTMLFormElement>(triggerEl, "form");
    if (!form) return;

    eventTarget = form;
    const enctype = (form.enctype || "").toLowerCase();

    if (enctype === "multipart/form-data") {
      body = new FormData(form);
    } else {
      const formData = new FormData(form);
      const params = new URLSearchParams();
      for (const [key, value] of formData.entries()) {
        if (typeof value === "string") {
          params.append(key, value);
        }
      }
      const paramString = params.toString();

      if (method === "GET") {
        url = buildUrlWithParams(url, paramString);
      } else {
        body = paramString;
        headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8";
      }
    }
  } else {
    if (event && (triggerEl.tagName === "A" || triggerEl.hasAttribute("href"))) {
      event.preventDefault();
    }

    if (method !== "GET") {
      const paramsAttr = triggerEl.getAttribute("data-puma-params");
      if (paramsAttr) {
        body = paramsAttr;
        headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8";
      }
    }
  }

  const beforeSendEv = triggerEvent<PumaBeforeSendEventDetail>(
    eventTarget,
    "puma:beforeSend",
    { url, method, headers, body },
  );
  if (beforeSendEv.defaultPrevented) return;

  url = beforeSendEv.detail.url;
  method = beforeSendEv.detail.method;
  headers = beforeSendEv.detail.headers;
  body = beforeSendEv.detail.body;

  if (hasLoader) {
    if (loaderMode === "spinner" || loaderMode === "both") {
      loader.show(triggerEl);
    }
    if ((loaderMode === "skeleton" || loaderMode === "both") && targetEl) {
      loader.showSkeleton(targetEl);
    }
  }

  try {
    const result = await request(url, { method, headers, body });
    handleResponseForElement(eventTarget, result.text);
  } catch (error) {
    triggerEvent<PumaErrorEventDetail>(eventTarget, "puma:error", { error });
  } finally {
    if (hasLoader) {
      if (loaderMode === "spinner" || loaderMode === "both") {
        loader.hide(triggerEl);
      }
      if ((loaderMode === "skeleton" || loaderMode === "both") && targetEl) {
        loader.hideSkeleton(targetEl);
      }
    }
    triggerEvent(eventTarget, "puma:after", {});
  }
}

export function bind(el: Element | null): void {
  if (!el || boundElements.has(el)) return;
  boundElements.add(el);

  const type = el.getAttribute("data-puma") || "";

  if (el.tagName === "FORM" || type === "submit") {
    el.addEventListener("submit", (ev) => {
      handleAction(el, ev);
    });
  } else {
    el.addEventListener("click", (ev) => {
      handleAction(el, ev);
    });
  }
}

export function scan(root?: ParentNode): void {
  const container = root ?? (typeof document !== "undefined" ? document : null);
  if (!container) return;

  const nodes = qsa("[data-puma]", container);
  for (const node of nodes) {
    bind(node);
  }

  const forms = qsa("form[data-puma]", container);
  for (const form of forms) {
    bind(form);
  }
}

function startObserver(): void {
  if (typeof MutationObserver !== "undefined" && !observer && typeof document !== "undefined") {
    observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (!m.addedNodes) continue;
        for (const node of m.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          const el = node as Element;
          if (el.hasAttribute("data-puma")) {
            bind(el);
          }
          scan(el);
        }
      }
    });

    const target = document.documentElement ?? document.body;
    if (target) {
      observer.observe(target, {
        childList: true,
        subtree: true,
      });
    }
  }
}

export function init(opts?: PumaInitOptions): void {
  if (opts?.headers) {
    Object.assign(defaultHeaders, opts.headers);
  }
  if (typeof document === "undefined") return;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      scan();
      startObserver();
    });
  } else {
    scan();
    startObserver();
  }
}

export const puma: Puma = {
  init,
  request,
  bind,
  scan,
  onBeforeFetch: null,
  loader,
};

export const Puma = puma;
