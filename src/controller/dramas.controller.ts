import Elysia, { t } from "elysia";
import AsianwikiRepositoryImpl from "../repository/asianwiki.repository";
import { Logestic } from "logestic";
import { DateTime } from "luxon";

export const dramasController = (app: Elysia) => {
  return app
    .state("repository", new AsianwikiRepositoryImpl())
    .group("/dramas", (app) =>
      app
        .get(
          "/slider",
          async ({
            store: { repository },
            logestic,
          }: {
            store: { repository: AsianwikiRepositoryImpl };
            logestic: Logestic;
          }) => repository.slider()
        )
        .get(
          "/upcoming",
          async ({
            store: { repository },
            query,
            logestic,
          }: {
            store: { repository: AsianwikiRepositoryImpl };
            query: { month: number };
            logestic: Logestic;
          }) => {
            const dt = DateTime.now().set({ month: query.month });
            const month = dt.toFormat("MMMM");
            return repository.upcoming(month);
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
            }),
            transform({ query }) {
              const newMonth = +query.month;
              query.month = newMonth;
            },
          }
        )
    );
};
