import type { StructureResolver } from "sanity/structure";

export const SINGLETONS = new Set(["siteSettings"]);

// Sidebar in the order a club volunteer thinks about it.
export const structure: StructureResolver = (S) =>
  S.list()
    .title("Cougars website")
    .items([
      S.listItem()
        .title("Club details & homepage")
        .id("siteSettings")
        .child(S.document().schemaType("siteSettings").documentId("siteSettings").title("Club details & homepage")),
      S.divider(),
      S.documentTypeListItem("event").title("Events"),
      S.documentTypeListItem("video").title("Videos"),
      S.documentTypeListItem("album").title("Photo albums"),
      S.documentTypeListItem("player").title("Team roster"),
      S.divider(),
      S.documentTypeListItem("sponsor").title("Sponsors"),
    ]);
