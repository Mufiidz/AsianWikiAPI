import { load } from "cheerio";
import baseScrape from "../utils/baseScrape";
import { DateTime } from "luxon";
import { recordEntries, recordKeys } from "../utils/record";
import { NotFoundError } from "elysia";
import { BadRequest } from "../utils/errors";
import translate from "translate";

interface PersonRepository {
  getDetailPerson(id: string): Promise<any>;
}

export default class PersonRepositoryImpl implements PersonRepository {
  async getDetailPerson(id: string, langCode: string = "en"): Promise<any> {
    if (id.length <= 2) {
      throw new BadRequest("Id must be at least 2 characters long");
    }
    const baseUrl = Bun.env.BASE_URL;
    try {
      const url = `${baseUrl}/${id}`;
      const html = await baseScrape(url);
      const $ = load(html);
      const langs = Intl.NumberFormat.supportedLocalesOf(langCode);

      if (langs.length === 0) {
        throw new BadRequest("Invalid language code");
      }

      let title = $("h1").text().trim();
      let imageUrl = $(".thumb.tright .thumbimage").attr("src");

      if (imageUrl) {
        imageUrl = `${baseUrl}${imageUrl}`;
      }

      const ratingText = $("#w4g_rb_area-1").text().trim();

      const ratingMatch = ratingText.match(/(\d+)\/100/);
      const votesMatch = ratingText.match(/(\d+)\s+votes/);

      const rating = ratingMatch ? parseInt(ratingMatch[1], 10) : undefined;
      const votes = votesMatch ? parseInt(votesMatch[1], 10) : undefined;
      let type = "Unknown";

      /// Getting Profile info
      const personDetails: Record<string, any> = {};

      const profileSection = $('h2:contains("Profile")').next("ul");
      const listItems = profileSection.find("li").toArray();

      for (const el of listItems) {
        const fullText = $(el).text().trim();
        const rawKey = $(el).find("b").text();
        const rawValue = fullText.replace(rawKey, "").trim();

        const key = rawKey.trim().toCamelCase();
        let value: any = rawValue.trim();

        if (!key) continue;

        if (key === "born") {
          const birthDate = DateTime.fromFormat(value, "LLLL d, yyyy");
          value = birthDate.toISO();

          const age = DateTime.now().diff(birthDate, "years").years;
          const roundedAge = Math.floor(age);
          personDetails["age"] = roundedAge;
        }

        if (key === "height") {
          value = value ? parseInt(value, 10) : null;
          console.log("height", value);
        }

        if (key === "birthplace" || key === "university") {
          value = await translate(value, langCode);
        }

        personDetails[key] = value ? value : null;
      }

      // ✅ Tambahkan default null untuk social fields jika belum ada
      const socialKeys = ["facebook", "instagram", "tiktok", "x"];
      for (const key of socialKeys) {
        if (!(key in personDetails)) {
          personDetails[key] = null;
        }
      }

      /// replace some keys
      recordKeys(personDetails).find((key) => {
        if (key.contain("hangul", false) || key.contain("japanese", false)) {
          personDetails["nativeName"] = personDetails[key];
          delete personDetails[key];
        }
      });

      for (const [key, value] of recordEntries(personDetails)) {
        if (typeof value === "string") {
          personDetails[key] = value.cleaned();
        }
      }

      recordKeys(personDetails).find((key) => {
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

      if (type != "Actrees") {
        throw new NotFoundError(`Only Actrees are supported. (${type})`);
      }

      personDetails["type"] = type;

      let biographies: string[] | null = null;

      /// Getting Biography
      const biographyElements = $('h2:contains("Bio")').first();

      let nextBiography = biographyElements.next();

      while (nextBiography.length && nextBiography[0].tagName !== "h2") {
        if (nextBiography.is("p")) {
          let biography = $.text(nextBiography)
            .replace(/\n/g, "") // remove newlines
            .replace(/\s{2,}/g, " ") // collapse multiple spaces
            .replace(/\[\d+\]/g, "") // remove square brackets
            .trim();

          biography = await translate(biography, langCode);

          biographies = biographies ? [...biographies, biography] : [biography];
        }

        nextBiography = nextBiography.next();
      }

      /// Getting Notes
      const notesElement = $("h2:contains('Notes')");

      const notesHtml = $.html(notesElement.next("ol"))
        .replace(/\n/g, "") // remove newlines
        .replace(/\s{2,}/g, " ") // collapse multiple spaces
        .replace(/>\s+</g, "><") // remove space between tags
        .trim();

      const notes = notesHtml ? notesHtml : null;

      const shows: {}[] = [];

      const h2Elements = $("h2, h3").toArray();

      for (const el of h2Elements) {
        const sectionTitle = $(el).text().trim();
        const lowerSectionTitle = sectionTitle.toLowerCase();

        // Skip jika judulnya "Profile"
        const skippedSections = [
          "profile",
          "awards",
          "references",
          "external links",
          "director",
          "screenwriter",
        ];
        if (skippedSections.includes(lowerSectionTitle)) {
          continue;
        }

        const ul = $(el).next("ul");

        // Skip jika tidak ada <ul> atau tidak ada <li> di dalam <ul>
        if (!ul.length || ul.find("li").length === 0) continue;

        const items: {
          id: string | null;
          title: string | null;
          altTitle: string | null;
          network: string | null;
          year: number | null;
          cast: string | null;
        }[] = [];

        /// regex for detailing show
        const regex =
          /^(.+?)\s*(?:\|\s*(.+?))?\s*\((?:(.+?)\/\s*)?(\d{4})\)\s*-\s*(.+)$/;

        ul.find("li").each((_, li) => {
          const anchor = $(li).find("a").first();
          const id = anchor.attr("href")?.replace(/^\//, "") || null;

          const fullText = $(li).text().trim();
          const match = fullText.match(regex);
          if (match) {
            const [, title, altTitle, network, year, cast] = match;
            items.push({
              id: id ? id.trim() : null,
              title: title ? title.trim() : null,
              altTitle: altTitle ? altTitle.trim() : null,
              network: network ? network.trim() : null,
              year: year ? +year.trim() : null,
              cast: cast ? cast.trim() : null,
            });
          }
        });

        let translatedSectionTitle = await translate(sectionTitle, langCode);
        translatedSectionTitle = translatedSectionTitle.capitalEachWord();

        shows.push({
          section: translatedSectionTitle,
          items,
        });
      }

      /// Getting Awards
      // TODO : get awards

      return {
        id,
        title,
        imageUrl,
        ...personDetails,
        rating,
        votes,
        biographies,
        notes,
        shows,
      };
    } catch (error) {
      throw error;
    }
  }
}
