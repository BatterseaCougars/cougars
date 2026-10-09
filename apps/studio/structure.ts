import type { StructureBuilder, StructureResolver } from "sanity/structure";

// Singleton documents: one each, with a fixed _id equal to the type name (the website and the team app find
// them by it).
export const SINGLETONS = new Set(["club", "fridays", "pub", "team", "kumite"]);

const singleton = (S: StructureBuilder, type: string, title: string) =>
  S.listItem().title(title).id(type).child(S.document().schemaType(type).documentId(type).title(title));

// Sidebar in the order a club volunteer thinks about it: the Friday night first, the rarely-changed basics last.
export const structure: StructureResolver = (S) =>
  S.list()
    .title("Cougars website")
    .items([
      singleton(S, "fridays", "Fridays"),
      singleton(S, "pub", "Pub"),
      S.documentTypeListItem("event").title("Events"),
      S.listItem()
        .title("Kumite")
        .id("kumite-folder")
        .child(
          S.list()
            .title("Kumite")
            .items([singleton(S, "kumite", "About the Kumite")]),
        ),
      S.listItem()
        .title("Team")
        .id("team-folder")
        .child(
          S.list()
            .title("Team")
            .items([singleton(S, "team", "About the team"), S.documentTypeListItem("player").title("Players")]),
        ),
      S.documentTypeListItem("video").title("Videos"),
      S.documentTypeListItem("album").title("Photos"),
      S.divider(),
      singleton(S, "club", "Club"),
      S.documentTypeListItem("sponsor").title("Sponsors"),
    ]);
