import { load } from "cheerio";
import baseScrape from "../utils/baseScrape";

enum SearchType {
  DEFAULT = "default",
  IMAGE = "images",
}

interface SearchRepository {
  searchAll(query: string): Promise<any>;
  searchTitle(title: string): Promise<any[]>;
  searchText(text: string): Promise<any[]>;
  getImageDrama(query: string): Promise<string | null>;
}

export default class SearchRepositoryImpl implements SearchRepository {
  async searchAll(query: string): Promise<any> {
    try {
      const dramas = await this.searchTitle(query);
      const texts = await this.searchText(query);
      return {
        titles: dramas,
        texts,
      };
    } catch (error) {
      throw error;
    }
  }
  async searchTitle(title: string): Promise<any[]> {
    try {
      const html = await baseScrape(`${this.baseUrl}&search=${title}`);
      const $ = load(html);

      const results: {}[] = [];

      const elementTitle = $('h2:contains("Page title matches")');
      const isTitleExists = elementTitle.length === 1;

      if (!isTitleExists) return results;

      elementTitle
        .next("ul.mw-search-results")
        .find("li")
        .each((_index, element) => {
          const titleElement = $(element).find(".mw-search-result-heading a");
          const title = titleElement.text().trim();
          const link = titleElement.attr("href") || "";
          const description = $(element).find(".searchresult").text().trim();
          const descriptionMatch = description.match(/File:([^|}]+)/);
          const image = descriptionMatch
            ? descriptionMatch[1].replace(/\s+/g, "_")
            : null;
          results.push({
            title,
            link: `${Bun.env.BASE_URL}${link}`,
            imageUrl: image ? `${Bun.env.BASE_URL}/images/a/a9/${image}` : null,
          });
        });
      return results;
    } catch (error) {
      throw error;
    }
  }
  async searchText(text: string): Promise<any[]> {
    try {
      const html = await baseScrape(`${this.baseUrl}&search=${text}`);
      const $ = load(html);

      const results: {}[] = [];

      const elementTitle = $('h2:contains("Page text matches")');
      const isTitleExists = elementTitle.length === 1;

      if (!isTitleExists) return results;

      elementTitle
        .next("ul.mw-search-results")
        .find("li")
        .each((_index, element) => {
          const titleElement = $(element).find(".mw-search-result-heading a");
          const title = titleElement.text().trim();
          const link = titleElement.attr("href") || "";
          let description = $(element).find(".searchresult").text().trim();
          description = description.replace(/\*\s*\[\[(.*?)\]\]/, "$1");

          if (title.toLocaleLowerCase().startsWith(text.toLocaleLowerCase()))
            return;

          results.push({
            title,
            link: `${Bun.env.BASE_URL}${link}`,
            description,
          });
        });

      return results;
    } catch (error) {
      throw error;
    }
  }

  async getImageDrama(query: string): Promise<string | null> {
    try {
      const baseUrl = this.baseUrl(query, SearchType.IMAGE);
      console.log({ baseUrl });
      const html = await baseScrape(baseUrl);

      const $ = load(html);

      let results: {
        imageUrl: string | null;
        imagePage: string | null;
        title: string;
        metadata: string;
      }[] = [];

      $("ul.mw-search-results li").each((_, el) => {
        const imageTag = $(el).find("img");
        const imageUrl = imageTag.attr("src");
        const imagePage = $(el).find("a.image").attr("href");
        const title = $(el).find("a[title]").attr("title") || "";
        const metadata = $(el).find(".mw-search-result-data").text().trim();

        results.push({
          imageUrl: imageUrl ? `${Bun.env.BASE_URL}${imageUrl}` : null,
          imagePage: imagePage ? `${Bun.env.BASE_URL}${imagePage}` : null,
          title,
          metadata,
        });
      });

      if (results.length <= 0) return null;

      const defaultImage = results[0].imageUrl;

      results = results.filter((value) =>
        value.title
          .replace(/\.[^/.]+$/, "")
          .startWith(/File:(.+?)-(p|tp|cp)\d*$/, false)
      );

      if (results.length <= 0) return defaultImage;

      return results.at(-1)?.imageUrl || null;
    } catch (error) {
      throw error;
    }
  }

  baseUrl = (
    search: string,
    searchType: SearchType = SearchType.DEFAULT
  ): string =>
    search.isEmpty()
      ? ""
      : `${Bun.env.BASE_URL}/index.php?profile=${searchType}&fulltext=Search&search=${search}`;
}
