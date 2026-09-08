import "./name-gen.css";

const button = document.querySelector("#generate-names");
button?.addEventListener("click", async () => {
  if (!(button instanceof HTMLButtonElement)) return;
  button.disabled = true;
  try {
    const response = await fetch("/name-gen/names", { headers: { accept: "text/html" } });
    if (!response.ok) throw new Error(`Name request failed: ${response.status}`);
    const current = document.querySelector("#names-container");
    if (current) current.outerHTML = await response.text();
  } finally {
    button.disabled = false;
  }
});
