import Elysia, { t } from "elysia";
import PersonRepositoryImpl from "../repository/person.repository";

export const personController = (app: Elysia) => {
  return app
    .state("personRepository", new PersonRepositoryImpl())
    .group("/person", (app) =>
      app.get(
        "/:id",
        async ({
          params: { id },
          store: { personRepository },
        }: {
          params: { id: string };
          store: { personRepository: PersonRepositoryImpl };
        }) => personRepository.getDetailPerson(id),
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
              const { id } = params;
              params.id = id.formatTitle();
          }
        }
      )
    );
};
