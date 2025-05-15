import { load } from "cheerio";
import translate from "translate";
import Cast from "../model/cast.model";
import Drama from "../model/drama.model";
import baseScrape from "../utils/baseScrape";
import { BadRequest } from "../utils/errors";
import { recordEntries, recordKeys, recordValues } from "../utils/record";
import { htmlDetailDrama, htmlDetailMovie } from "../example/detailshow";
import { NotFoundError } from "elysia";
import { parseDateRange } from "../utils/dateRange";

interface ShowRepository {
  getDetailDrama(id: string): Promise<Drama>;
  getCastsDrama(id: string): Promise<Cast[]>;
}

export default class ShowRepositoryImpl implements ShowRepository {
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
      let type = "Unknown";

      /// Getting Profile info
      const dramaDetails: Record<string, any> = {};

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

      recordKeys(dramaDetails).find((key) => {
        if (key == "drama") {
          type = "Drama";
        } else if (key == "movie" || key == "tvMovie") {
          type = "Movie";
        } else if (key == "name") {
          type = "Actrees";
        } else {
          type = type;
        }
      }) ?? "Unknown";

      if (type == "Unknown" || type == "Actrees") {
        throw new NotFoundError(
          `Only Drama and Movie are supported. (${type})`
        );
      }

      dramaDetails["type"] = type;

      /// parse releaseDate
      const releaseDate = dramaDetails["releaseDate"];
      if (releaseDate) {
        dramaDetails["releaseDateRange"] = parseDateRange(releaseDate);
      }

      /// Getting Synopsis
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
        .cleaned()
        .trim();

      let idTranslated: string | null = null;
      if (synopsisText.length > 0) {
        idTranslated = (await translate(synopsisText, "id")).cleaned();
      }

      const links = synopsisElement
        .find("a")
        .map((_, el) => ({
          name: $(el).text().trim(),
          url: `${baseUrl}${$(el).attr("href")}`,
        }))
        .get();

      /// Getting Image
      if (imageUrl) {
        imageUrl = `${baseUrl}${imageUrl}`;
      }

      /// Getting Notes
      const notesElement = $("h2:contains('Notes')");

      const notesHtml = $.html(notesElement.next("ol"))
        .replace(/\n/g, "") // remove newlines
        .replace(/\s{2,}/g, " ") // collapse multiple spaces
        .replace(/>\s+</g, "><") // remove space between tags
        .trim();

      /// replace some key
      recordKeys(dramaDetails).forEach((key) => {
        if (key.contain("drama", false) || key.contain("movie", false)) {
          dramaDetails["alternativeTitle"] = dramaDetails[key];
          delete dramaDetails[key];
        }
        if (key.contain("hangul", false) || key.contain("japanese", false)) {
          dramaDetails["nativeTitle"] = dramaDetails[key];
          delete dramaDetails[key];
        }
        if (
          key.contain("romaji", false) ||
          key.contain("revisedRomanization", false)
        ) {
          dramaDetails["latinTitle"] = dramaDetails[key];
          delete dramaDetails[key];
        }
      });

      for (const [key, value] of recordEntries(dramaDetails)) {
        if (typeof value === "string") {
          dramaDetails[key] = value.cleaned();
        }
      }

      const notes = notesHtml ? notesHtml : null;

      // if (notes) {
      //   notes = await translate(notes, "id");
      // }

      const drama = new Drama(id, title, url, imageUrl, rating, votes);

      return {
        ...drama,
        ...dramaDetails,
        ...{ notes },
        ...{ synopsis: { original: synopsisText, id: idTranslated, links } },
      };
    } catch (error) {
      throw error;
    }
  }

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
}
