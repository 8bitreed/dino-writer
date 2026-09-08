// @ts-check
import "./app.css";

const root = document.documentElement;
const savedTheme = localStorage.getItem("writer-tools-theme");
if (savedTheme === "light" || savedTheme === "dark") root.dataset.theme = savedTheme;

document.querySelector("#theme-toggle")?.addEventListener("click", () => {
  const dark = root.dataset.theme === "dark" ||
    (!root.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
  root.dataset.theme = dark ? "light" : "dark";
  localStorage.setItem("writer-tools-theme", root.dataset.theme);
});

document.querySelector("#nav-toggle")?.addEventListener("click", () => {
  document.querySelector("#site-nav")?.classList.toggle("open");
});

for (const form of document.querySelectorAll("form[data-confirm]")) {
  form.addEventListener("submit", (event) => {
    if (!confirm(form.getAttribute("data-confirm") ?? "Continue?")) event.preventDefault();
  });
}
