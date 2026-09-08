import type { FC } from "@hono/hono/jsx";
import { generateNames } from "../lib/names.ts";

export const NameGrid: FC = () => {
  const names = generateNames();
  return (
    <div id="names-container" class="name-grid">
      <section class="card stack">
        <h2>Character Names</h2>
        <ul class="name-list">
          {names.characters.map((name) => <li key={name}>{name}</li>)}
        </ul>
      </section>
      <section class="card stack">
        <h2>Place Names</h2>
        <ul class="name-list">
          {names.places.map((name) => <li key={name}>{name}</li>)}
        </ul>
      </section>
    </div>
  );
};

export const nameGrid = (): ReturnType<typeof NameGrid> => <NameGrid />;
