interface String {
  toCamelCase(): string;
  formatTitle(): string;
  startWith(value: string | RegExp, caseSensitive?: boolean): boolean;
  isEmpty(): boolean;
}

String.prototype.toCamelCase = function (): string {
  return this.toLowerCase()
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(" ")
    .map((word, index) =>
      index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join("");
};

String.prototype.formatTitle = function (): string {
  const text = this.trim();
  return decodeURIComponent(text)
    .split(" ")
    .map((word) => {
      if (word.startsWith("(")) {
        const cleanedWord = word.replace("(", "");
        return `${word.charAt(0)}${
          cleanedWord.charAt(0).toUpperCase() + cleanedWord.slice(1)
        }`;
      } else {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
    })
    .join("_");
};

String.prototype.startWith = function (
  value: string | RegExp,
  caseSensitive: boolean = true
): boolean {
  if (!value) return false;

  const str = this.toString();

  if (typeof value === "string") {
    if (!caseSensitive) {
      return str.toLowerCase().startsWith(value.toLowerCase());
    }
    return str.startsWith(value);
  }

  let regex = value;
  const pattern = regex.source;

  if (!pattern.startsWith("^")) {
    regex = new RegExp("^" + pattern, caseSensitive ? regex.flags : regex.flags + "i");
  } else if (!caseSensitive && !regex.flags.includes("i")) {
    regex = new RegExp(pattern, regex.flags + "i");
  }

  console.log({regex})

  return regex.test(str);
};

String.prototype.isEmpty = function (): boolean {
  return this.trim().length <= 0;
};
