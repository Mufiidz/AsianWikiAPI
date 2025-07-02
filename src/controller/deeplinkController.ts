import Elysia, { t } from "elysia";
import AsianwikiRepositoryImpl from "../repository/asianwiki.repository";

export const deeplinkController = (app: Elysia) => {
  return app
    .state("asianwikiRepository", new AsianwikiRepositoryImpl())
    .group("/deeplink", (app) =>
      app
        .get(
          "/:id",
          async ({
            params: { id },
            store: { asianwikiRepository },
          }: {
            params: { id: string };
            store: { asianwikiRepository: AsianwikiRepositoryImpl };
          }) => {
            const deeplink = `asianwiki://deeplink/${id}`;
            return new Response(
              `
    <html>
      <head>
        <title>Open App</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script>
          window.location = '${deeplink}';
          setTimeout(function () {
            window.location = '${Bun.env.BASE_URL}/${id}';
          }, 2000);
        </script>
      </head>
      <body>
        <p>Opening your app...</p>
      </body>
    </html>
  `,
              {
                headers: {
                  "Content-Type": "text/html",
                },
              }
            );
          },
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
            transform({ params }) {
              const id = params.id;
              const newId = id.formatTitle();

              params.id = newId;
            },
          }
        )
        .get(
          "/type/:id",
          async ({
            params: { id },
            store: { asianwikiRepository },
          }: {
            params: { id: string };
            store: { asianwikiRepository: AsianwikiRepositoryImpl };
          }) => asianwikiRepository.getContentTypes(id),
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
            transform({ params }) {
              const id = params.id;
              const newId = id.formatTitle();

              params.id = newId;
            },
          }
        )
    );
};
