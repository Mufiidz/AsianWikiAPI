interface String {
  toCamelCase(): string;
  formatTitle(): string;
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
