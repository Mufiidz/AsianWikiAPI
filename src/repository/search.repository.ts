import { load } from "cheerio";
import baseScrape from "../utils/baseScrape";

interface SearchRepository {
  searchAll(query: string): Promise<any>;
  searchTitle(title: string): Promise<any[]>;
  searchText(text: string): Promise<any[]>;
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

  baseUrl =
    "https://asianwiki.com/index.php?title=Special%3ASearch&profile=default&fulltext=Search";
}
