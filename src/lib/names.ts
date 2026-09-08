const characters = [
  "ael",
  "beo",
  "bert",
  "briht",
  "cuth",
  "cyn",
  "ead",
  "eald",
  "eth",
  "fric",
  "gar",
  "here",
  "leo",
  "mund",
  "os",
  "red",
  "ric",
  "sig",
  "stan",
  "theod",
  "wald",
  "ward",
  "wig",
  "wine",
  "wulf",
];
const places = [
  "ac",
  "aesc",
  "apel",
  "baeth",
  "brad",
  "ceald",
  "eald",
  "glast",
  "grene",
  "heah",
  "hwit",
  "lang",
  "lunden",
  "middel",
  "mor",
  "nor",
  "ox",
  "stan",
  "suth",
  "west",
];
const endings = [
  "barrow",
  "borough",
  "bourne",
  "broc",
  "burn",
  "ceaster",
  "clif",
  "cot",
  "dale",
  "den",
  "dun",
  "ey",
  "field",
  "ford",
  "ham",
  "hurst",
  "ley",
  "mere",
  "port",
  "stead",
  "thorpe",
  "ton",
  "well",
  "wick",
  "worth",
];

const pick = (values: string[]): string =>
  values[crypto.getRandomValues(new Uint32Array(1))[0] % values.length];
const capitalize = (value: string): string => (value[0]?.toUpperCase() ?? "") + value.slice(1);

function generate(parts: string[], endingsList: string[] | null = null): string {
  const count = 2 + crypto.getRandomValues(new Uint8Array(1))[0] % 2;
  let name = "";
  for (let index = 0; index < count; index++) {
    name += index === count - 1 && endingsList ? pick(endingsList) : pick(parts);
  }
  return capitalize(name);
}

export function generateNames(count = 8): { characters: string[]; places: string[] } {
  return {
    characters: Array.from({ length: count }, () => generate(characters)),
    places: Array.from({ length: count }, () => generate(places, endings)),
  };
}
