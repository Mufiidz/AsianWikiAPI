import { CheerioAPI, load } from "cheerio";
import translate from "translate";
import Cast from "../model/cast.model";
import Drama from "../model/drama.model";
import baseScrape from "../utils/baseScrape";
import { BadRequest } from "../utils/errors";
import { recordEntries, recordKeys } from "../utils/record";
import { NotFoundError } from "elysia";
import { parseDateRange } from "../utils/dateRange";

interface ShowRepository {
  getDetail(id: string, langCode: string): Promise<Drama>;
  getCasts(id: string): Promise<Cast[]>;
}

export default class ShowRepositoryImpl implements ShowRepository {
  async getDetail(id: string, langCode: string = "en"): Promise<Drama> {
    if (id.length <= 2) {
      throw new BadRequest("Id must be at least 2 characters long");
    }

    try {
      const baseUrl = Bun.env.BASE_URL;
      const url = `${baseUrl}/${id}`;
      const html = await baseScrape(url);
      const $ = load(html);
      const langs = Intl.NumberFormat.supportedLocalesOf(langCode);

      if (langs.length === 0) {
        throw new BadRequest("Invalid language code");
      }

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

      const elements = $("ul li").toArray();

      for (const el of elements) {
        let key = $(el).find("b").text().replace(":", "").trim();
        let value: any = $(el).clone().children().remove().end().text().trim();

        const linkText = $(el)
          .find("a")
          .map((_, a) => $(a).text().trim())
          .get()
          .join(", ");
        if (linkText) value = linkText;

        if (!key || !value) continue;

        key = key.toCamelCase();

        if (key === "episodes") {
          value = parseInt(value, 10) || null;
        }

        if (key === "language" || key === "country") {
          value = await translate(value, langCode);
        }

        dramaDetails[key] = value;
      }

      recordKeys(dramaDetails).find((key) => {
        if (key == "drama") {
          type = "Drama";
        } else if (key == "movie" || key == "tvMovie") {
          type = "Movie";
        } else if (key == "name") {
          type = "Actress";
        } else {
          type = type;
        }
      }) ?? "Unknown";

      if (type == "Unknown" || type == "Actress") {
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
      const synopsisTexts: string[] = [];
      const synopsisLinks: {}[] = [];
      const synopsisElement = $("h2:contains('Plot Synopsis')");

      synopsisElement.nextAll().each(function () {
        const tag = this.tagName.toLowerCase();
        if (tag === "p") {
          const cleanText = $(this)
            .clone()
            .children("a")
            .replaceWith(function () {
              return $(this).text().trim();
            })
            .end()
            .text()
            .trim();

          $(this)
            .find("a")
            .each(function () {
              synopsisLinks.push({
                name: $(this).text().trim(),
                url: `${baseUrl}${$(this).attr("href")}`,
              });
            });

          if (cleanText) {
            synopsisTexts.push(cleanText);
          }
        } else {
          return false;
        }
      });

      const synopsisTranslated: string[] = [];
      if (synopsisTexts.length > 0) {
        console.log({ synopsisTexts });

        for (const synopsisText of synopsisTexts) {
          const translated = (
            await translate(synopsisText, langCode)
          ).cleaned();

          if (translated) {
            synopsisTranslated.push(translated);
          }
        }
      }

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
        ...{
          synopsis: {
            original: synopsisTexts,
            translated: synopsisTranslated,
            links: synopsisLinks,
          },
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async getCasts(id: string): Promise<any[]> {
    if (id.length <= 2) {
      throw new BadRequest("Id must be at least 2 characters long");
    }

    const baseUrl = Bun.env.BASE_URL;
    const url = `${baseUrl}/${id}`;
    const html = await baseScrape(url);
    const $ = load(html);

    checkIsShow(id, $);

    const castData: { title: string; casts: Cast[] }[] = [];
    let parsingCast = false;

    $("h2, h3, p b").each((_, element) => {
      const title = $(element).text().trim();

      if (title === "Cast") {
        parsingCast = true;
      } else if (title.startsWith("Additional Cast")) {
        parsingCast = false;
        return false;
      }

      if (!parsingCast) return;

      let current = $(element).next();
      const isList = current.is("ul, ol");

      if (isList) {
        const casts = current
          .find("li")
          .map((_, li) => {
            const linkElement = $(li).find("a");
            const name = linkElement.text().trim();
            const id = linkElement.attr("href")?.split("/").pop();
            const cast = $(li)
              .text()
              .replace(linkElement.text(), "")
              .trim()
              .replace("- ", "");
            return new Cast(id, name, `${baseUrl}/${id}`, undefined, cast);
          })
          .get();

        castData.push({ title, casts });
        return false;
      }

      const links: any[] = [];
      const names: string[] = [];
      const characters: string[] = [];

      while (
        current.length &&
        !["h2", "h3"].includes(current[0].tagName?.toLowerCase())
      ) {
        if (current[0].tagName?.toLowerCase() === "table") {
          current.find("tr").each((index, row) => {
            const cells = $(row).find("td");
            if (index === 1) {
              cells.find("a").each((_, a) => {
                const href = $(a).attr("href");
                const id = href?.split("/").pop();
                const profileUrl = href?.startsWith("http")
                  ? href
                  : `${baseUrl}${href}`;
                const imageUrl = $(a).find("img").attr("src");
                links.push({
                  id,
                  profileUrl,
                  imageUrl: imageUrl ? `${baseUrl}${imageUrl}` : null,
                });
              });
            } else if (index === 2) {
              names.push(...cells.map((_, td) => $(td).text().trim()).get());
            } else if (index === 3) {
              characters.push(
                ...cells.map((_, td) => $(td).text().trim()).get()
              );
            }
          });
        }
        current = current.next();
      }

      const casts = links.map((link, index) => ({
        ...link,
        name: names[index],
        cast: characters[index],
      }));

      castData.push({ title, casts });
    });

    const additionalCast = $('p:contains("Additional Cast Members") + ul li')
      .map((_, li) => {
        const linkElement = $(li).find("a");
        const name = linkElement.text().trim();
        const id = linkElement.attr("href")?.split("/").pop();
        const cast = $(li)
          .text()
          .replace(linkElement.text(), "")
          .trim()
          .replace("- ", "");
        return new Cast(id, name, `${baseUrl}/${id}`, undefined, cast);
      })
      .get();

    if (additionalCast.length) {
      castData.push({
        title: "Additional Cast Members",
        casts: additionalCast,
      });
    }

    return castData.filter((cast) => cast.casts.length > 0);
  }
}

function checkIsShow(id: string, $: CheerioAPI) {
  let type = "Unknown";
  const dramaDetails: Record<string, any> = {};

  const elements = $("ul li").toArray();

  for (const el of elements) {
    let key = $(el).find("b").text().replace(":", "").trim();
    let value: any = $(el).clone().children().remove().end().text().trim();

    const linkText = $(el)
      .find("a")
      .map((_, a) => $(a).text().trim())
      .get()
      .join(", ");
    if (linkText) value = linkText;

    if (!key || !value) continue;

    key = key.toCamelCase();
    dramaDetails[key] = value;
  }

  recordKeys(dramaDetails).find((key) => {
    if (key == "drama") {
      type = "Drama";
    } else if (key == "movie" || key == "tvMovie") {
      type = "Movie";
    } else if (key == "name") {
      type = "Actress";
    } else {
      type = type;
    }
  }) ?? "Unknown";

  if (type == "Unknown" || type == "Actress") {
    throw new NotFoundError(`Only Drama and Movie are supported. (${type})`);
  }
}
