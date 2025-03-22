import Elysia, { t } from "elysia";
import AsianwikiRepositoryImpl from "../repository/asianwiki.repository";
import "./../utils/string";

export const dramaController = (app: Elysia) =>
  app
    .state("asianWikiRepository", new AsianwikiRepositoryImpl())
    .group("/drama", (app) =>
      app
        .get(
          "/:id",
          async ({
            params: { id },
            store: { asianWikiRepository },
          }: {
            params: { id: string };
            store: { asianWikiRepository: AsianwikiRepositoryImpl };
          }) => asianWikiRepository.getDetailDrama(id),
          {
            params: t.Object({
              id: t.String({
                minLength: 3,
                error({ errors, value }: { errors: any[]; value: any }) {
                  const valueError = errors[0];

                  const { id } = value;
                  const minLength = valueError.schema.minLength;

                  if (id.length < minLength) {
                    return `Expected param ${valueError.path} length greater or equal to ${minLength}`;
                  } else {
                    return valueError.summary;
                  }
                },
              }),
            }),
            transform({ params }) {
              const id = params.id;
              const newId = id.formatTitle();

              params.id = newId;
            },
          }
        )
        .get(
          "/casts/:id",
          async ({
            params: { id },
            store: { asianWikiRepository },
          }: {
            params: { id: string };
            store: { asianWikiRepository: AsianwikiRepositoryImpl };
          }) => asianWikiRepository.getCastsDrama(id),
          {
            params: t.Object({
              id: t.String({
                minLength: 3,
                error({ errors, value }: { errors: any[]; value: any }) {
                  const valueError = errors[0];

                  const { id } = value;

                  if (id.length < 3) {
                    return `Expected param ${valueError.path} length greater or equal to 3`;
                  } else {
                    return valueError.summary;
                  }
                },
              }),
            }),
            transform({ params }) {
              const id = params.id;
              const newId = id.formatTitle();

              params.id = newId;
            },
          }
        )
    );
