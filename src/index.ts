import swagger from "@elysiajs/swagger";
import { Elysia, redirect } from "elysia";
import { Logestic } from "logestic";
import {
  useErrorResponse,
  useSuccessResponse,
} from "./middleware/response.midleware";
import { searchController } from "./controller/search.controller";
import { dramasController } from "./controller/dramas.controller";
import { dramaController } from "./controller/drama.controller";

const app = new Elysia()
  .use(
    swagger({
      path: "/docs",
      exclude: ["/"],
      documentation: {
        info: {
          title: "Unofficial AsianWiki API",
          version: "1.0.0",
          description: "API Docs for AsianWiki",
        },
      },
    })
  )
  .use(Logestic.preset("fancy"))
  .get("/", ({ log }: { log: Logestic }) => redirect("/docs"))
  .use(useSuccessResponse)
  .use(useErrorResponse)
  .use(searchController)
  .use(dramasController)
  .use(dramaController)
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
