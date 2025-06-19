import swagger from "@elysiajs/swagger";
import { Elysia, redirect } from "elysia";
import { Logestic } from "logestic";
import {
  useErrorResponse,
  useSuccessResponse,
} from "./middleware/response.midleware";
import { searchController } from "./controller/search.controller";
import { asianWikiController } from "./controller/asianwiki.controller";
import { showController } from "./controller/show.controller";
import { personController } from "./controller/person.controller";

const app = new Elysia({
  serve: {
    idleTimeout: 30,
  },
})
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
  .use(asianWikiController)
  .use(showController)
  .use(personController)
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
