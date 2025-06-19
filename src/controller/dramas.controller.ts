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
            query: { month, page, isDrama },
            logestic,
          }: {
            store: { asianWikiRepository: AsianwikiRepositoryImpl };
            query: { month: number; page: number; isDrama: boolean };
            logestic: Logestic;
          }) => {
            const dt = DateTime.now().set({ month: month });
            const newMonth = dt.toFormat("MMMM");
            return asianWikiRepository.getUpcoming(newMonth, isDrama, page);
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
              isDrama: t.Optional(
                t.Boolean({
                  default: true,
                  error({
                    errors,
                    value,
                  }: {
                    errors: any[];
                    value: { isDrama: boolean };
                  }) {
                    const valueError = errors[0];
                    const errorMessage = valueError.summary;

                    if (
                      errorMessage ===
                      "Property 'isDrama' should be one of: 'boolean', 'boolean'"
                    ) {
                      return "Property 'isDrama' should be one of: 'true', 'false'";
                    }
                    return errorMessage;
                  },
                })
              ),
              page: t.Optional(
                t.Number({
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
                })
              ),
            }),
            transform({ query }) {
              const { month, page, isDrama } = query;
              const newMonth = +month;
              const newPage = +(page ?? 1);

              query.month = newMonth;
              query.page = newPage;
            },
          }
        )
    );
};
