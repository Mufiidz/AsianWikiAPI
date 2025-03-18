import { Static, t } from "elysia";

const BaseResponseSchema = t.Object({
  message: t.String(),
  code: t.Number(),
  status: t.String(),
});

const SuccessResponseSchema = t.Composite([
  BaseResponseSchema,
  t.Object({
    data: t.Any(),
    page: t.Optional(t.Object({ total: t.Number() })),
  }),
]);

export type SuccessResponse = Static<typeof SuccessResponseSchema>;

const ErrorResponseSchema = t.Composite([
  BaseResponseSchema,
  t.Object({
    // TODO : SOON
    // errors: t.Array(t.Any()),
  }),
]);

export type ErrorResponse = Static<typeof ErrorResponseSchema>;
