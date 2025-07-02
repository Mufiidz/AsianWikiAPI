import swagger from "@elysiajs/swagger";
import { Elysia, file, redirect } from "elysia";
import { Logestic } from "logestic";
import {
  useErrorResponse,
  useSuccessResponse,
} from "./middleware/response.midleware";
import { searchController } from "./controller/search.controller";
import { asianWikiController } from "./controller/asianwiki.controller";
import { showController } from "./controller/show.controller";
import { personController } from "./controller/person.controller";
import { deeplinkController } from "./controller/deeplinkController";

const deeplinkAndroid = file(".well-known/assetlinks.json");
const deeplinkIos = file(".well-known/apple-app-site-association");

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
  .get(deeplinkAndroid.path, () => deeplinkAndroid)
  .get(deeplinkIos.path, () => deeplinkIos)
  .use(useSuccessResponse)
  .use(useErrorResponse)
  .use(searchController)
  .use(asianWikiController)
  .use(showController)
  .use(personController)
  .use(deeplinkController)
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
