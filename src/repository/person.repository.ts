import { load } from "cheerio";
import baseScrape from "../utils/baseScrape";
import { DateTime } from "luxon";

interface PersonRepository {
  getDetailPerson(id: string): Promise<any>;
}

export default class PersonRepositoryImpl implements PersonRepository {
  async getDetailPerson(id: string): Promise<any> {
    const baseUrl = Bun.env.BASE_URL;
    try {
      const url = `${baseUrl}/${id}`;
      const html = await baseScrape(url);
      const $ = load(html);

      let imageUrl = $(".thumb.tright .thumbimage").attr("src");
      const ratingText = $("#w4g_rb_area-1").text().trim();

      const ratingMatch = ratingText.match(/(\d+)\/100/);
      const votesMatch = ratingText.match(/(\d+)\s+votes/);

      const profileData: Record<string, string> = {};
      const moviesData: Array<any> = [];
      const dramaData: Array<any> = [];
      const tvData: Array<any> = [];

      let isProfileSection = false;
      let isMoviesSection = false;
      let isDramaSection = false;
      let isTvMovieSection = false;

      $("h2, ul").each((_, element) => {
        const tag = $(element).prop("tagName");

        if (tag === "H2") {
          const title = $(element).text().trim().toLowerCase();

          if (title === "profile") {
            isProfileSection = true;
          } else if (title === "notes" || title === "movies") {
            isMoviesSection = true;
          } else if (title === "drama series") {
            isDramaSection = true;
          } else if (title === "tv movies") {
            isTvMovieSection = true;
          } else {
            isProfileSection = false;
            isMoviesSection = false;
            isDramaSection = false;
            isTvMovieSection = false;
          }
        }

        if (isProfileSection && tag === "UL") {
          $(element)
            .find("li")
            .each((_, el) => {
              let key = $(el).find("b").text().replace(":", "").trim();
              let value: any = $(el)
                .clone()
                .children()
                .remove()
                .end()
                .text()
                .trim();

              const linkText = $(el)
                .find("a")
                .map((_, a) => $(a).text().trim())
                .get()
                .join(", ");
              if (linkText) value = linkText;

              if (!key || !value) return;

              key = key.toCamelCase();

              if (key === "birthdate") {
                value = DateTime.fromFormat(value, "MMMM d, yyyy");
              }

              profileData[key] = value;
            });
        }

        if (isMoviesSection && tag === "UL") {
          $(element)
            .find("li")
            .each((_, li) => {
              const aTag = $(li).find("a");
              const title = aTag.text().trim();
              let id = aTag.attr("href") || null;
              id = id?.split("/").pop() || null;
              const detail = $(li).text().replace(`${title} |`, "").trim();

              if (title) {
                moviesData.push({ id, title, detail });
              }
            });
        }

        if (isDramaSection && tag === "UL") {
          $(element)
            .find("li")
            .each((_, li) => {
              const aTag = $(li).find("a");
              const title = aTag.text().trim();
              let id = aTag.attr("href") || null;
              id = id?.split("/").pop() || null;
              const detail = $(li).text().replace(`${title} |`, "").trim();

              if (title) {
                dramaData.push({ id, title, detail });
              }
            });
        }

        if (isTvMovieSection && tag === "UL") {
          $(element)
            .find("li")
            .each((_, li) => {
              const aTag = $(li).find("a");
              const title = aTag.text().trim();
              let id = aTag.attr("href") || null;
              id = id?.split("/").pop() || null;
              const detail = $(li).text().replace(`${title} |`, "").trim();

              if (title) {
                tvData.push({ id, title, detail });
              }
            });
        }
      });

      const notes: {}[] = [];
      // Cari elemen h2 dengan id Notes
      const notesSection = $("h2:has(span#Notes)");

      if (notesSection.length === 0) {
        return []; // Jika tidak ditemukan, kembalikan array kosong
      }

      // Ambil semua elemen setelah h2 Notes hingga h2 berikutnya
      let currentElement = notesSection.next();
      while (currentElement.length && !currentElement.is("h2")) {
        if (currentElement.is("ol")) {
          currentElement.find("li").each((_, li) => {
            const text = $(li).text().trim();
            const links: { title: string; url: string }[] = [];

            $(li)
              .find("a")
              .each((_, a) => {
                const title = $(a).text().trim();
                const url = $(a).attr("href") || "";
                links.push({ title, url });
              });

            notes.push({ text, links });
          });
        }
        currentElement = currentElement.next();
      }

      const rating = ratingMatch ? parseInt(ratingMatch[1], 10) : null;
      const votes = votesMatch ? parseInt(votesMatch[1], 10) : null;
      if (imageUrl) {
        imageUrl = `${baseUrl}${imageUrl}`;
      }

      return {
        ...profileData,
        imageUrl,
        rating,
        votes,
        notes,
        movies: moviesData,
        dramas: dramaData,
        tvMovies: tvData,
      };
    } catch (error) {
      throw error;
    }
  }
}
