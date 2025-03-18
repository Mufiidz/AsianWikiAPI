import Elysia, { t } from "elysia";
import AsianwikiRepositoryImpl from "../repository/asianwiki.repository";
import { Logestic } from "logestic";
import { PagedData } from "../model/pageddata.model";

export const searchController = (app: Elysia) => {
  return app.state("repository", new AsianwikiRepositoryImpl()).get(
    "/search",
    async ({
      query,
      logestic,
    }: {
      query: { title: string };
      logestic: Logestic;
    }) => {
      const { title } = query;
      logestic.info(`searching for ${title}`);
      return title
    //   return new PagedData([title, title], {
    //     total: 1,
    //     size: 1,
    //     page: 1,
    //     currentPage: 1,
    //   });
    },
    { query: t.Object({ title: t.String() }) }
  );
};
