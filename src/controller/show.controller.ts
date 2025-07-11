import Elysia, { t } from "elysia";
import "../utils/string";
import ShowRepositoryImpl from "../repository/show.repository";

export const showController = (app: Elysia) =>
  app.state("showRepository", new ShowRepositoryImpl()).group("/show", (app) =>
    app
      .get(
        "/:id",
        async ({
          params: { id },
          query: { lang },
          store: { showRepository },
        }: {
          params: { id: string };
          query: { lang: string };
          store: { showRepository: ShowRepositoryImpl };
        }) => showRepository.getDetail(id, lang),
        {
          params: t.Object({
            id: t.String({
              minLength: 1,
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
          query: t.Object({
            lang: t.Optional(t.String()),
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
          store: { showRepository },
        }: {
          params: { id: string };
          store: { showRepository: ShowRepositoryImpl };
        }) => showRepository.getCasts(id),
        {
          params: t.Object({
            id: t.String({
              minLength: 1,
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
