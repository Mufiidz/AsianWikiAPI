import Elysia, { t } from "elysia";
import SearchRepositoryImpl from "../repository/search.repository";

enum Type {
  ALL = "all",
  TITLE = "title",
  TEXT = "text",
}

export const searchController = (app: Elysia) =>
  app.state("repository", new SearchRepositoryImpl()).group("/search", (app) =>
    app
      .get(
        "/",
        async ({
          store: { repository },
          query: { search, type },
        }: {
          store: { repository: SearchRepositoryImpl };
          query: { search: string; type: string };
        }) => {
          if (type === Type.TITLE) {
            return repository.searchTitle(search);
          } else if (type === Type.TEXT) {
            return repository.searchText(search);
          } else {
            return repository.searchAll(search);
          }
        },
        {
          query: t.Object({
            search: t.String({
              minLength: 3,
              error({
                errors,
                value: { search },
              }: {
                errors: any[];
                value: any;
              }) {
                const valueError = errors[0];
                if (!search) {
                  return "Property 'search' is required";
                }
                return valueError.summary;
              },
            }),
            type: t.UnionEnum([Type.ALL, Type.TITLE, Type.TEXT], {
              default: Type.ALL,
              error: `Property 'type' must be '${Type.ALL}', '${Type.TITLE}', or '${Type.TEXT}'.`,
            }),
          }),
        }
      )
      .get(
        "/title/:title",
        async ({
          store: { repository },
          params: { title },
        }: {
          store: { repository: SearchRepositoryImpl };
          params: { title: string };
        }) => repository.searchTitle(title),
        {
          params: t.Object({
            title: t.String({
              minLength: 3,
              error({ errors }: { errors: any[] }) {
                const valueError = errors[0];
                return valueError.summary;
              },
            }),
          }),
          transform({ params }) {
            const { title } = params;
            params.title = title.replace(/\s+/g, "+");
          },
        }
      )
      .get(
        "/text/:text",
        async ({
          store: { repository },
          params: { text },
        }: {
          store: { repository: SearchRepositoryImpl };
          params: { text: string };
        }) => repository.searchText(text),
        {
          params: t.Object({
            text: t.String({
              minLength: 3,
              error({ errors }: { errors: any[] }) {
                const valueError = errors[0];
                return valueError.summary;
              },
            }),
          }),
          transform({ params }) {
            const { text } = params;
            params.text = text.replace(/\s+/g, "+");
          },
        }
      )
  );
