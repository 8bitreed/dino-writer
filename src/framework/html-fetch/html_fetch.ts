/**
 * HTML Fetch — programmatic HTML fetcher with optional trigger binding
 *
 * - HTML-only: responses must be text/html to be applied to the DOM
 * - method is optional and defaults to GET
 * - optionally bind an event (trigger) on an element (triggerEl) to call load
 *
 * Example:
 * await htmlFetch.load({
 *   url: '/search/pizza',
 *   method: 'GET',                 // optional (defaults to GET)
 *   target: '#pizza',
 *   trigger: 'click',              // optional: event name to bind
 *   triggerEl: '#my-search-button' // optional: selector or Element
 * });
 */

import { buildUrlWithParams, serializeForm } from "./utilties.ts";
import { HtmlFetchError } from "./HtmlFetchError.ts";

type Swap = "inner" | "outer";

interface LoadOpts {
  url: string;
  method?: string;
  headers?: HeadersInit;
  body?: BodyInit | null;
  target?: string | Element | null;
  swap?: Swap | null;
  trigger?: string | null;
  triggerEl?: string | Element | null;
  triggerOptions?: AddEventListenerOptions;
}

interface SubmitFormOpts {
  method?: string;
  action?: string | null;
  target?: string | Element | null;
  swap?: Swap | null;
  trigger?: EventTarget | null;
}

const HTML_FETCH_HEADERS = Object.freeze({
  "Html-Fetch": "true",
  Accept: "text/html",
});

function req(url: string, options: RequestInit = {}) {
  const headers = new Headers(HTML_FETCH_HEADERS);
  new Headers(options.headers).forEach((value, name) => headers.set(name, value));

  return fetch(url, { ...options, headers });
}

function swapHtml(targetEl: Element, html: string, swap: Swap | null = "inner") {
  if (swap?.toLowerCase() === "outer") {
    targetEl.outerHTML = html;
  } else {
    targetEl.innerHTML = html;
  }
}

export function createHtmlFetch(root: ParentNode = document) {
  const resolveElement = (value: string | Element) =>
    typeof value === "string" ? root.querySelector(value) : value;

  function attachTrigger(opts: LoadOpts) {
    const { trigger, triggerEl, triggerOptions, ...loadOptions } = opts;
    const element = triggerEl ? resolveElement(triggerEl) : null;
    if (!trigger || !element) return () => {};

    const handler = () => {
      load(loadOptions).catch((err) => {
        console.error("HTML Fetch: load failed on triggered event", err);
      });
    };

    element.addEventListener(trigger, handler, triggerOptions);

    return () => element.removeEventListener(trigger, handler, triggerOptions);
  }

  async function load(opts: LoadOpts) {
    const {
      url,
      method = "GET",
      headers,
      body = null,
      target = null,
      swap = "inner",
      trigger,
      triggerEl,
    } = opts;

    if (trigger && triggerEl) {
      return { bound: true, unbind: attachTrigger(opts) };
    }

    const res = await req(url, { method, headers, body });
    const text = await res.text();
    const contentType = res.headers.get("content-type")?.toLowerCase() ?? "";

    if (!contentType.includes("text/html")) {
      throw new HtmlFetchError("Html Fetch: non-HTML response", res, text);
    }

    if (!res.ok) {
      throw new HtmlFetchError(`Html Fetch: request failed (${res.status})`, res, text);
    }

    if (target) {
      const targetElement = resolveElement(target);
      if (targetElement) swapHtml(targetElement, text, swap);
    }

    return res;
  }

  function submitForm(form: HTMLFormElement, opts: SubmitFormOpts = {}) {
    const method = (opts.method || form.getAttribute("method") || "GET").toUpperCase();
    const action = opts.action != null
      ? opts.action
      : form.getAttribute("action") || globalThis.location.href;
    const { target, swap = "inner" } = opts;
    const serialized = serializeForm(form);

    if (method === "GET") {
      let params: string;
      if (serialized instanceof FormData) {
        const searchParams = new URLSearchParams();
        serialized.forEach((value, name) => searchParams.append(name, String(value)));
        params = searchParams.toString();
      } else {
        params = serialized;
      }

      return load({
        url: buildUrlWithParams(action, params),
        method,
        target,
        swap,
      });
    }

    const headers = serialized instanceof FormData
      ? undefined
      : { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" };

    return load({
      url: action,
      method: "POST",
      headers,
      body: serialized,
      target,
      swap,
    });
  }

  return {
    request: req,
    load,
    submitForm,
    headers: HTML_FETCH_HEADERS,
  };
}
