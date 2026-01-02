interface String {
  toCamelCase(): string;
  formatTitle(): string;
  startWith(value: string | RegExp, caseSensitive?: boolean): boolean;
  isEmpty(): boolean;
  contain(value: string, caseSensitive?: boolean): boolean;
  cleaned(): string;
  onlyAlphanumeric(): string;
  capitalEachWord(): string;
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
    regex = new RegExp(
      "^" + pattern,
      caseSensitive ? regex.flags : regex.flags + "i"
    );
  } else if (!caseSensitive && !regex.flags.includes("i")) {
    regex = new RegExp(pattern, regex.flags + "i");
  }

  return regex.test(str);
};

String.prototype.isEmpty = function (): boolean {
  return this.trim().length <= 0;
};

String.prototype.contain = function (
  value: string,
  caseSensitive: boolean = true
): boolean {
  if (caseSensitive) {
    return this.includes(value);
  } else {
    return this.toLocaleLowerCase().includes(value.toLocaleLowerCase());
  }
};

String.prototype.cleaned = function (): string {
  return this.replace(/\s+/g, " ").trim();
};

String.prototype.onlyAlphanumeric = function (): string {
  return this.replace(/[^a-zA-Z0-9 ]/g, "").trim();
};

String.prototype.capitalEachWord = function (): string {
  return this.split(" ")
    .map((word) =>
      word.length > 0
        ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        : ""
    )
    .join(" ");
};

