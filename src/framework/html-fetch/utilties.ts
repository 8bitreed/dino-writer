export function qs(el: Element | null, selector: string): Element | null {
  if (!selector) return null;
  const root = (el && el.ownerDocument) || document;
  return root.querySelector(selector);
}

export function triggerEvent(
  target: EventTarget,
  name: string,
  detail: Record<string, unknown> | string | null = null,
): Event {
  let ev;
  try {
    ev = new CustomEvent(name, {
      detail: detail,
      bubbles: true,
      cancelable: true,
    });
  } catch (_e) {
    ev = document.createEvent("CustomEvent");
    ev.initCustomEvent(name, true, true, detail);
  }
  target.dispatchEvent(ev);
  return ev;
}

export function serializeForm(form: HTMLFormElement): FormData | string {
  // Return either FormData (if has files) or URLSearchParams for application/x-www-form-urlencoded
  try {
    const fd = new FormData(form);
    // Check whether there's any file inputs with files (FormData works fine)
    return fd;
  } catch {
    // Fallback: manual serialization
    const params: string[] = [];
    Array.prototype.slice.call(form.elements).forEach(function (
      el: HTMLInputElement,
    ) {
      if (!el.name || el.disabled) return;
      if (el.type === "checkbox" || el.type === "radio") {
        if (!el.checked) return;
      }
      params.push(
        encodeURIComponent(el.name) + "=" + encodeURIComponent(el.value),
      );
    });
    return params.join("&");
  }
}

export function buildUrlWithParams(url: string, params: string): string {
  if (!params) return url;
  const separator = url.indexOf("?") === -1 ? "?" : "&";
  return url + separator + params;
}
