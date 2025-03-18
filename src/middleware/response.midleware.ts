import Elysia from "elysia";
import { ErrorResponse } from "../schemas/response";
import HttpStatus from "http-status-codes";
import { PagedData } from "../model/pageddata.model";
import { BadRequest } from "../utils/errors";

export const isJsonString = (str: string) => {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
};

export const useSuccessResponse = (app: Elysia) => {
  return app.onAfterHandle(async ({ path, response, set }): Promise<any> => {
    if (path.includes("/docs")) return;
    const code = Number(set.status) ?? 200;
    if (response instanceof PagedData) {
      return {
        code,
        status: HttpStatus.getStatusText(code),
        message: "Success",
        data: response.data,
        page: response.page,
      };
    }

    return {
      code,
      message: "Success",
      data: response,
    };
  });
};

export const useErrorResponse = (app: Elysia) => {
  return app
    .error({ BadRequest })
    .onError(async ({ error, set, code }): Promise<ErrorResponse> => {
      let message =
        "message" in error
          ? isJsonString(error.message)
            ? JSON.parse(error.message)
            : error.message
          : "ERROR";

      switch (code) {
        case "NOT_FOUND":
          set.status = 404;
          message = message ?? "Not Found";
          break;
        case "VALIDATION":
          set.status = 400;
          const errors = message.errors;
          console.error({ errors });
          console.error({ error });
          message = message ?? errors.shift().summary ?? "Validation Error";
          break;
        case "BadRequest":
          set.status = 400;
          message = message ?? "Bad Request";
          break;
        default:
          message = message;
          break;
      }

      const statusCode =
        Number(set.status) ?? ("status" in error ? error.status : 500);
      return {
        code: statusCode,
        status: HttpStatus.getStatusText(statusCode),
        message,
      };
    });
};
