import { load } from "cheerio";
import baseScrape from "../utils/baseScrape";
import { SearchType } from "../model/searchType";
import Search from "../model/searchModel";

interface SearchRepository {
  searchAll(query: string): Promise<Search[]>;
  getImageSearch(fileName: string): Promise<string | null>;
  getImageDrama(query: string): Promise<string | null>;
}

export default class SearchRepositoryImpl implements SearchRepository {
  async searchAll(title: string, type?: string): Promise<Search[]> {
    try {
      const baseUrl = this.baseUrl(title);
      const html = await baseScrape(baseUrl);
      const $ = load(html);

      const results: Search[] = [];

      const elementTitle = $('h2:contains("Page title matches")');
      const isTitleExists = elementTitle.length === 1;

      if (!isTitleExists) return results;

      const listItems = elementTitle
        .next("ul.mw-search-results")
        .find("li")
        .get();

      for (const element of listItems) {
        const titleElement = $(element).find(".mw-search-result-heading a");
        const title = titleElement.text().trim();
        const link = titleElement.attr("href") || "";
        const description = $(element).find(".searchresult").text().trim();
        const isImgFile = description.match(
          /(?:ImagePortrait\|File:|Image:|File:)([^|\}\n]+?\.(jpg|jpeg|png))/i
        );

        const imgFileName = isImgFile ? isImgFile[1] : null;
        let match: RegExpMatchArray | null = null;

        switch (type) {
          case SearchType.DRAMA:
            match = description.match(/'''(Drama):'''\s*(.+)/);
            break;
          case SearchType.MOVIE:
            match = description.match(/'''(Movie):'''\s*(.+)/);
            break;
          case SearchType.NAME:
            match = description.match(/'''(Name):'''\s*(.+)/);
            break;
          default:
            match = description.match(/'''(Drama|Movie|Name):'''\s*(.+)/);
            break;
        }

        if (!match) continue;

        let image = null;

        if (imgFileName) {
          image =
            (await this.getImageSearch(imgFileName)) ||
            (await this.getImageDrama(imgFileName));
        }

        results.push({
          id: link.replace(/\//g, ""),
          title,
          type: match[1],
          url: `${Bun.env.BASE_URL}${link}`,
          imageUrl: image,
        });
      }
      return results;
    } catch (error) {
      throw error;
    }
  }

  async getImageSearch(fileName: string): Promise<string | null> {
    try {
      fileName = encodeURIComponent(fileName);
      const baseUrl = `${Bun.env.BASE_URL}/File:${fileName}`;
      const html = await baseScrape(baseUrl);
      const $ = load(html);

      const imageLink = $(".fullMedia a").attr("href");

      if (imageLink) {
        return `${Bun.env.BASE_URL}${imageLink}`;
      }

      return null;
    } catch (error) {
      throw error;
    }
  }

  async getImageDrama(query: string): Promise<string | null> {
    try {
      const baseUrl = this.baseUrl(query, true);
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

  baseUrl = (search: string, isImage: boolean = false): string =>
    search.isEmpty()
      ? ""
      : `${Bun.env.BASE_URL}/index.php?profile=${
          isImage ? "images" : "default"
        }&fulltext=Search&search=${search}`;
}
