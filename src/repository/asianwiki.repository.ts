import { load } from "cheerio";
import Drama from "../model/drama.model";
import Upcoming from "../model/upcoming.model";
import { BadRequest } from "../utils/errors";
import translate from "translate";
import Cast from "../model/cast.model";
import baseScrape from "../utils/baseScrape";
import SearchRepositoryImpl from "./search.repository";
import { DateTime } from "luxon";
import { Page, PagedData } from "../model/pageddata.model";

interface AsianwikiRepository {
  slider(): Promise<Drama[]>;
  searchDrama(title: string): Promise<String[]>;
  upcoming(month: string): Promise<Upcoming[]>;
  getUpcoming(month: string, page: number): Promise<PagedData<{}>>;
  getDetailDrama(id: string): Promise<Drama>;
  getCastsDrama(id: string): Promise<Cast[]>;
}

export default class AsianwikiRepositoryImpl implements AsianwikiRepository {
  searchRepository = new SearchRepositoryImpl();

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

  /** Gets the upcoming dramas
   * @deprecated use {@link getUpcoming()}
   */
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
          (item) => item.date.startWith(month, false) && item.dramas.length > 0
        );
      return results;
    } catch (error) {
      throw error;
    }
  }

  async getUpcoming(month: string, page: number = 1): Promise<PagedData<{}>> {
    try {
      console.log({ month });
      const html = await baseScrape(
        `${Bun.env.BASE_URL}/Template:UpcomingDramas${month}`
      );

      const $ = load(html);

      let allDramas: {
        id: string;
        title: string;
        imageUrl: string | null;
      }[] = [];
      const pageSize = 5;

      const columns = $('#mw-content-text > div[style*="width: 50%"]');
      let currentWeek: string | null = null;

      columns.each((_, col) => {
        const parentUl = $(col).find("> ul").first(); // ambil <ul> utama

        parentUl.contents().each((_, node) => {
          if (node.type === "text") {
            const possibleWeek = $(node).text().trim();
            if (possibleWeek && possibleWeek.length > 0) {
              currentWeek = possibleWeek.replace(/^"+|"+$/g, "").trim();
            }
          }

          if (node.type === "tag" && node.name === "ul") {
            const subUl = $(node);

            subUl.find("li").each((_, li) => {
              const parentText = $(li).text().trim();
              const element = load(parentText);
              const aTag = element("a");

              const title = aTag
                .text()
                .replace(/\s+/g, " ")
                .replace(/_/g, " ")
                .trim();
              const link = aTag.attr("href")?.trim() || "";
              const id = link?.split("/").pop() || null;
              const networkMatch = parentText.trim().match(/\(([^()]+)\)$/);
              const network = networkMatch ? networkMatch[1] : null;

              if (!id || !title || !link) return;

              allDramas.push({
                id,
                title,
                imageUrl: null,
                ...{
                  link,
                  network,
                  week: currentWeek,
                  weekRange: currentWeek
                    ? this.parseDateRange(currentWeek)
                    : null,
                },
              });
            });
          }
        });
      });

      const length = allDramas.length;
      const totalPages = Math.ceil(length / pageSize);

      console.log(length);

      let pagedData = new PagedData(
        allDramas,
        new Page(length, allDramas.length, totalPages, page)
      );

      if (length <= 0) return pagedData;

      const start = (page - 1) * pageSize;
      const end = start + pageSize;

      allDramas = allDramas.slice(start, end);

      console.log(allDramas.length);

      if (allDramas.length > 0) {
        for (const drama of allDramas) {
          const imageUrl = await this.searchRepository.getImageDrama(
            drama.title
          );
          drama.imageUrl = imageUrl;
        }
      }

      pagedData.data = allDramas;
      pagedData.page = new Page(length, allDramas.length, totalPages, page);

      return pagedData;
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

  parseDateRange(weekStr: string): { start: Date; end: Date } | null {
    try {
      const currentYear = new Date().getFullYear();
      const zone = "Asia/Jakarta";

      // Format: "April 1-7"
      const rangeMatch = weekStr.match(/^([A-Za-z]+)\s+(\d{1,2})-(\d{1,2})$/);
      if (rangeMatch) {
        const [, monthStr, startDayStr, endDayStr] = rangeMatch;

        const start = DateTime.fromFormat(
          `${monthStr} ${startDayStr} ${currentYear}`,
          "LLLL d yyyy",
          { zone }
        );
        const end = DateTime.fromFormat(
          `${monthStr} ${endDayStr} ${currentYear}`,
          "LLLL d yyyy",
          { zone }
        );

        if (!start.isValid || !end.isValid) return null;

        return {
          start: start.toJSDate(),
          end: end.toJSDate(),
        };
      }

      // Format: "January 2"
      const singleDateMatch = weekStr.match(/^([A-Za-z]+)\s+(\d{1,2})$/);
      if (singleDateMatch) {
        const [, monthStr, dayStr] = singleDateMatch;

        const date = DateTime.fromFormat(
          `${monthStr} ${dayStr} ${currentYear}`,
          "LLLL d yyyy",
          { zone }
        );

        if (!date.isValid) return null;

        return {
          start: date.toJSDate(),
          end: date.toJSDate(),
        };
      }

      // Format: "2025"
      if (/^\d{4}$/.test(weekStr)) {
        const year = parseInt(weekStr);
        const start = DateTime.fromObject({ year, month: 1, day: 1 }, { zone });
        const end = DateTime.fromObject({ year, month: 12, day: 31 }, { zone });
        return {
          start: start.toJSDate(),
          end: end.toJSDate(),
        };
      }

      return null;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}
