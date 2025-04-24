import Elysia, { t } from "elysia";
import AsianwikiRepositoryImpl from "../repository/asianwiki.repository";
import { Logestic } from "logestic";
import { DateTime } from "luxon";

export const dramasController = (app: Elysia) => {
  return app
    .state("asianWikiRepository", new AsianwikiRepositoryImpl())
    .group("/dramas", (app) =>
      app
        .get(
          "/slider",
          async ({
            store: { asianWikiRepository },
            logestic,
          }: {
            store: { asianWikiRepository: AsianwikiRepositoryImpl };
            logestic: Logestic;
          }) => asianWikiRepository.slider()
        )
        .get(
          "/upcoming",
          async ({
            store: { asianWikiRepository },
            query,
            logestic,
          }: {
            store: { asianWikiRepository: AsianwikiRepositoryImpl };
            query: { month: number; page: number };
            logestic: Logestic;
          }) => {
            const dt = DateTime.now().set({ month: query.month });
            const month = dt.toFormat("MMMM");
            return asianWikiRepository.getUpcoming(month, query.page);
          },
          {
            query: t.Object({
              month: t.Number({
                minimum: 1,
                maximum: 12,
                error({ errors, value }: { errors: any[]; value: any }) {
                  const valueError = errors[0];

                  const month = value.month;
                  if (month < 1) {
                    return "Month must be greater than 0";
                  } else if (month > 12) {
                    return "Month must be less than 13";
                  } else {
                    return valueError.summary;
                  }
                },
              }),
              page: t.Number({
                minimum: 1,
                default: 1,
                error({ errors, value }: { errors: any[]; value: any }) {
                  const valueError = errors[0];
                  const page = value.page;
                  if (page < 1) {
                    return "Page must be greater than 0";
                  }
                  return valueError.summary;
                },
              }),
            }),
            transform({ query }) {
              const newMonth = +query.month;
              const newPage = +query.page;

              query.month = newMonth;
              query.page = newPage;
            },
          }
        )
    );
};
