import { load } from "cheerio";
import Drama from "../model/drama.model";
import Upcoming from "../model/upcoming.model";
import { BadRequest } from "../utils/errors";
import translate from "translate";
import Cast from "../model/cast.model";
import baseScrape from "../utils/baseScrape";

interface AsianwikiRepository {
  slider(): Promise<Drama[]>;
  searchDrama(title: string): Promise<String[]>;
  upcoming(month: string): Promise<Upcoming[]>;
  getDetailDrama(id: string): Promise<Drama>;
  getCastsDrama(id: string): Promise<Cast[]>;
}

export default class AsianwikiRepositoryImpl implements AsianwikiRepository {
  async getCastsDrama(id: string): Promise<any[]> {
    if (id.length <= 2) {
      throw new BadRequest("Id must be at least 2 characters long");
    }

    try {
      const baseUrl = Bun.env.BASE_URL;
      const url = `${baseUrl}/${id}`;
      const html = await baseScrape(url);
      const $ = load(html);

      let castData: any = [];
      let stopParsing = false;

      $("h2, h3, p b").each((_, element) => {
        const title = $(element).text().trim();
        const table = $(element).next("table");

        if (title === "Additional Cast Members:") {
          stopParsing = true;

          const additionalCast: any[] = [];

          const additionalCastSection = $(
            'p:contains("Additional Cast Members")'
          ).next("ul");

          additionalCastSection.find("li").each((index, element) => {
            const linkElement = $(element).find("a");
            const name = linkElement.text().trim();
            const id = linkElement.attr("href")?.split("/").pop();
            const cast = $(element)
              .text()
              .replace(linkElement.text(), "")
              .trim()
              .replace("- ", "");

            additionalCast.push(
              new Cast(id, name, `${baseUrl}/${id}`, undefined, cast)
            );
          });

          castData.push({
            title: "Additional Cast Members",
            casts: additionalCast,
          });

          return;
        }

        if (stopParsing) return;

        if (table.length) {
          const ids: string[] = [];
          const actors: string[] = [];
          const profileUrls: string[] = [];
          const images: string[] = [];
          const characters: string[] = [];

          table.find("tr:nth-last-of-type(2) td a").each((_, el) => {
            const id = $(el).attr("href")?.split("/").pop();
            actors.push($(el).text().trim());
            ids.push(id || "");
            profileUrls.push(`${baseUrl}/${id}`);
          });

          table.find("tr:nth-of-type(2) td img").each((_, el) => {
            let imgSrc = $(el).attr("src");
            if (imgSrc && !imgSrc.startsWith("http")) {
              imgSrc = `${baseUrl}${imgSrc}`;
            }
            images.push(imgSrc || "");
          });

          table.find("tr:last-of-type td").each((_, el) => {
            characters.push($(el).text().trim());
          });

          const casts = actors.map((actor, index) => {
            if (!actor || !ids[index]) return;
            return new Cast(
              ids[index],
              actor,
              profileUrls[index],
              images[index],
              characters[index]
            );
          });

          castData.push({
            title,
            casts,
          });
        }
      });

      return castData;
    } catch (error) {
      throw error;
    }
  }
  async getDetailDrama(id: string): Promise<Drama> {
    if (id.length <= 2) {
      throw new BadRequest("Id must be at least 2 characters long");
    }

    try {
      const baseUrl = Bun.env.BASE_URL;
      const url = `${baseUrl}/${id}`;
      const html = await baseScrape(url);
      const $ = load(html);

      let title = $("h1").text().trim();
      let imageUrl = $(".thumb.tright .thumbimage").attr("src");

      const ratingText = $("#w4g_rb_area-1").text().trim();

      const ratingMatch = ratingText.match(/(\d+)\/100/);
      const votesMatch = ratingText.match(/(\d+)\s+votes/);

      const rating = ratingMatch ? parseInt(ratingMatch[1], 10) : undefined;
      const votes = votesMatch ? parseInt(votesMatch[1], 10) : undefined;

      const dramaDetails: Record<string, string> = {};

      $("ul li").each((_, el) => {
        let key = $(el).find("b").text().replace(":", "").trim();
        let value: any = $(el).clone().children().remove().end().text().trim();

        const linkText = $(el)
          .find("a")
          .map((_, a) => $(a).text().trim())
          .get()
          .join(", ");
        if (linkText) value = linkText;

        if (!key || !value) return;

        key = key.toCamelCase();

        if (key === "episodes") {
          value = parseInt(value, 10) || null;
        }

        dramaDetails[key] = value;
      });

      const synopsisElement = $("h2:contains('Plot Synopsis')").next("p");

      const synopsisText = synopsisElement
        .clone()
        .children("a")
        .replaceWith(function () {
          return `${$(this).text().trim()}`;
        })
        .remove()
        .end()
        .text()
        .trim();

      const idTranslated = await translate(synopsisText, "id");

      const links = synopsisElement
        .find("a")
        .map((_, el) => ({
          name: $(el).text().trim(),
          url: `${baseUrl}${$(el).attr("href")}`,
        }))
        .get();

      if (imageUrl) {
        imageUrl = `${baseUrl}${imageUrl}`;
      }

      const drama = new Drama(id, title, url, imageUrl, rating, votes);

      return {
        ...drama,
        ...dramaDetails,
        ...{ synopsis: { original: synopsisText, id: idTranslated, links } },
      };
    } catch (error) {
      throw error;
    }
  }
  async upcoming(month: string): Promise<Upcoming[]> {
    try {
      const html = await baseScrape(`${Bun.env.BASE_URL}/Main_Page`);

      const $ = load(html);

      let groupedResults: Record<string, Drama[]> = {};

      const dateRegex = /^[A-Za-z]+ \d+(-\d+)?$/;
      let currentDate = "";

      $("#slidorion2 .slide2 ul").each((_, element) => {
        $(element)
          .contents()
          .each((_, child) => {
            const node = $(child);
            const date = node.text().trim().replace(/"/g, "");

            if (child.type === "text" && dateRegex.test(date)) {
              currentDate = date;

              if (!groupedResults[currentDate]) {
                groupedResults[currentDate] = [];
              }
            }

            if (node.is("a")) {
              const title = node.text().trim() || null;
              const link = node.attr("href") || null;
              const id = link?.split("/").pop() || null;

              if (!title || !link || !id) return;

              if (currentDate) {
                groupedResults[currentDate].push(new Drama(id, title, link));
              }
            }
          });
      });
      const results: Upcoming[] = Object.entries(groupedResults)
        .map(([date, dramas]) => ({
          date,
          dramas,
        }))
        .filter(
          (item) =>
            item.date
              .toLocaleLowerCase()
              .startsWith(month.toLocaleLowerCase()) && item.dramas.length > 0
        );
      return results;
    } catch (error) {
      throw error;
    }
  }

  async slider(): Promise<Drama[]> {
    try {
      const html = await baseScrape(`${Bun.env.BASE_URL}/Main_Page`);

      const $ = load(html);

      const results: Drama[] = [];

      $(".amazingslider-slides li").each((_index, element) => {
        const anchor = $(element).find("a");
        const image = $(element).find("img");

        let title = image.attr("alt") || null;
        const link = anchor.attr("href") || null;
        const id = link?.split("/").pop() || null;
        const imageUrl = image.attr("src") || null;

        if (!title || !link || !imageUrl || !id) return;

        results.push(new Drama(id, title, link, imageUrl));
      });

      return results;
    } catch (error) {
      throw error;
    }
  }
  async searchDrama(_title: string): Promise<String[]> {
    throw new Error("Method not implemented.");
  }
}
