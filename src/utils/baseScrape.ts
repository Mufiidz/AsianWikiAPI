import { NotFoundError } from "elysia";

async function baseScrape(url: string): Promise<string> {
  try {
    if (!url || url.length <= 0) {
      throw new Error("Invalid URL");
    }
    const response = await fetch(url, {
      method: "GET",
    });

    if (response.status === 404) {
      throw new NotFoundError(`${url} Not Found`);
    }

    if (!response.ok) {
      console.log({ response });

      throw new Error(`Failed to fetch data (${response.status})`, {
        cause: response,
      });
    }

    return await response.text();
  } catch (error) {
    throw error;
  }
}

export default baseScrape;
