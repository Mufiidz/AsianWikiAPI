import { load } from "cheerio";
import Drama from "../model/drama.model";
import Upcoming from "../model/upcoming.model";
import baseScrape from "../utils/baseScrape";
import SearchRepositoryImpl from "./search.repository";
import { Page, PagedData } from "../model/pageddata.model";
import { parseDateRange } from "../utils/dateRange";
import { AsianWikiType } from "../model/contentType";
import { BadRequest } from "../utils/errors";

interface AsianwikiRepository {
  slider(): Promise<Drama[]>;
  upcoming(month: string): Promise<Upcoming[]>;
  getUpcoming(
    month: string,
    isDrama: boolean,
    page: number
  ): Promise<PagedData<{}>>;
  getAllUpcoming(month: string, page: number): Promise<PagedData<{}>>;
  getContentTypes(id: string): Promise<AsianWikiType>;
}

export default class AsianwikiRepositoryImpl implements AsianwikiRepository {
  searchRepository = new SearchRepositoryImpl();

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

  async getAllUpcoming(
    month: string,
    page: number = 1
  ): Promise<PagedData<{}>> {
    console.log({ month }); // Log bulan untuk debugging

    const types = ["Drama", "Movie"];
    const pageSize = 5;
    const allDramas: {
      id: string;
      title: string;
      imageUrl: string | null;
      type: string;
    }[] = [];

    for (const type of types) {
      const html = await baseScrape(
        `${Bun.env.BASE_URL}/Template:Upcoming${
          type === "Drama" ? "Dramas" : "Movies"
        }${month}`
      );
      const $ = load(html);

      // Proses setiap kolom konten
      $('#mw-content-text > div[style*="width: 50%"] > ul').each((_, ul) => {
        let currentWeek: string | null = null;

        $(ul)
          .contents()
          .each((_, node) => {
            if (node.type === "text") {
              const possibleWeek = $(node).text().trim();
              if (possibleWeek) {
                currentWeek = possibleWeek.replace(/^"+|"+$/g, "").trim();
              }
            }

            // Proses list item dalam ul
            if (node.type === "tag" && node.name === "ul") {
              $(node)
                .find("li")
                .each((_, li) => {
                  const parentText = $(li).text().trim();
                  const element = load(parentText);
                  const aTag = element("a");
                  const title = aTag.text().replace(/\s+|_/g, " ").trim();
                  const link = aTag.attr("href")?.trim() || "";
                  const id = link.split("/").pop();
                  const networkMatch = parentText.match(/\(([^()]+)\)$/);
                  const network = networkMatch?.[1] ?? null;

                  if (id && title && link) {
                    allDramas.push({
                      id,
                      title,
                      imageUrl: null,
                      type: type === "Drama" ? "Drama" : "Movie",
                      ...{
                        link,
                        network,
                        week: currentWeek,
                        weekRange: currentWeek
                          ? parseDateRange(currentWeek)
                          : null,
                      },
                    });
                  }
                });
            }
          });
      });
    }

    const totalItems = allDramas.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const start = (page - 1) * pageSize;
    const paginatedData = allDramas.slice(start, start + pageSize);

    console.log(totalItems); // Log total item
    console.log(paginatedData.length); // Log jumlah item setelah paginasi

    // Kode untuk mendapatkan imageUrl (di-comment untuk referensi)
    if (paginatedData.length > 0) {
      for (const drama of paginatedData) {
        const imageUrl = await this.searchRepository.getImageDrama(
          drama.title.onlyAlphanumeric()
        );
        drama.imageUrl = imageUrl;
      }
    }

    return new PagedData(
      paginatedData,
      new Page(totalItems, paginatedData.length, totalPages, page)
    );
  }

  async getUpcoming(
    month: string,
    isDrama: boolean = true,
    page: number = 1
  ): Promise<PagedData<{}>> {
    try {
      console.log({ month });
      const html = await baseScrape(
        `${Bun.env.BASE_URL}/Template:Upcoming${
          isDrama ? "Dramas" : "Movies"
        }${month}`
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
                  type: isDrama ? "Drama" : "Movie",
                  link,
                  network,
                  week: currentWeek,
                  weekRange: currentWeek ? parseDateRange(currentWeek) : null,
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
            drama.title.onlyAlphanumeric()
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

  async getContentTypes(id: string): Promise<AsianWikiType> {
    if (id.length <= 2) {
      throw new BadRequest("Id must be at least 2 characters long");
    }
    try {
      const baseUrl = Bun.env.BASE_URL;
      const url = `${baseUrl}/${id}`;
      const html = await baseScrape(url);
      const $ = load(html);

      const typeMap: Record<string, AsianWikiType> = {
        name: AsianWikiType.Actress,
        drama: AsianWikiType.DRAMA,
        movie: AsianWikiType.MOVIE,
      };

      for (const el of $("ul li").toArray()) {
        const rawKey = $(el)
          .find("b")
          .text()
          .replace(":", "")
          .trim()
          .toLowerCase();
        if (!rawKey) continue;

        const key = rawKey.toCamelCase();

        if (key in typeMap) {
          return typeMap[key];
        }
      }

      return AsianWikiType.UNKNOWN;
    } catch (error) {
      throw error;
    }
  }
}
