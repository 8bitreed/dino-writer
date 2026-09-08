// @ts-check

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

/** @param {string[]} values */
const pick = (values) => values[crypto.getRandomValues(new Uint32Array(1))[0] % values.length];
/** @param {string} value */
const capitalize = (value) => (value[0]?.toUpperCase() ?? "") + value.slice(1);

/** @param {string[]} parts @param {string[] | null} endingsList */
function generate(parts, endingsList = null) {
  const count = 2 + crypto.getRandomValues(new Uint8Array(1))[0] % 2;
  let name = "";
  for (let index = 0; index < count; index++) {
    name += index === count - 1 && endingsList ? pick(endingsList) : pick(parts);
  }
  return capitalize(name);
}

/** @param {number} [count] */
export function generateNames(count = 8) {
  return {
    characters: Array.from({ length: count }, () => generate(characters)),
    places: Array.from({ length: count }, () => generate(places, endings)),
  };
}
