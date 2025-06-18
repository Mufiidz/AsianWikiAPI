import Elysia, { t } from "elysia";
import SearchRepositoryImpl from "../repository/search.repository";
import { SearchType } from "../model/searchType";

export const searchController = (app: Elysia) =>
  app
    .state("searchRepository", new SearchRepositoryImpl())
    .group("/search", (app) =>
      app.get(
        "/",
        async ({
          store: { searchRepository },
          query: { query, type },
        }: {
          store: { searchRepository: SearchRepositoryImpl };
          query: { query: string; type: string };
        }) => searchRepository.searchAll(query, type),
        {
          query: t.Object({
            query: t.String({
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
                  return "Property 'query' is required";
                }
                return valueError.summary;
              },
            }),
            type: t.UnionEnum(
              [
                SearchType.ALL,
                SearchType.DRAMA,
                SearchType.MOVIE,
                SearchType.NAME,
              ],
              {
                default: SearchType.ALL,
                error: `Property 'type' must be '${SearchType.NAME}', '${SearchType.DRAMA}', '${SearchType.MOVIE}', or '${SearchType.ALL}'.`,
              }
            ),
          }),
          transform({ query }) {
            const { query: search, type } = query;

            query.query = encodeURIComponent(search);

            if (!type) {
              query.type = SearchType.ALL;
              return;
            }

            const typeMap: Record<string, SearchType> = {
              all: SearchType.ALL,
              drama: SearchType.DRAMA,
              movie: SearchType.MOVIE,
              name: SearchType.NAME,
            };

            const normalizedType = type.toLowerCase();
            query.type = typeMap[normalizedType] || type;
          },
        }
      )
    );
