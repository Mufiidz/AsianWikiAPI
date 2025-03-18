import Elysia from "elysia";
import AsianwikiRepositoryImpl from "../repository/asianwiki.repository";
import "./../utils/string";

export const dramaController = (app: Elysia) =>
  app
    .state("repository", new AsianwikiRepositoryImpl())
    .group("/drama", (app) =>
      app
        .get(
          "/:id",
          async ({
            params: { id },
            store: { repository },
          }: {
            params: { id: string };
            store: { repository: AsianwikiRepositoryImpl };
          }) => repository.getDetailDrama(id),
          {
            transform({ params }) {
              const id = params.id;
              const newId = id.formatTitle();
              console.log({ id, newId });

              params.id = newId;
            },
          }
        )
        .get(
          "/casts/:id",
          async ({
            params: { id },
            store: { repository },
          }: {
            params: { id: string };
            store: { repository: AsianwikiRepositoryImpl };
          }) => repository.getCastsDrama(id),
          {
            transform({ params }) {
              const id = params.id;
              const newId = id.formatTitle();
              console.log({ id, newId });

              params.id = newId;
            },
          }
        )
    );
