import { documentPreviewSlots } from "virtual:lucid-admin";
import { matchSlots } from "@/extensions/match-slots";

type PreviewReplacement = Extract<
	(typeof documentPreviewSlots)[number],
	{ slot: "document.preview" }
>;

/** The `document.preview` slot that replaces a collection's preview for the signed-in user, if any. */
export const findPreviewReplacement = (collectionKey: string) =>
	matchSlots(documentPreviewSlots, { collection: collectionKey }).find(
		(entry): entry is PreviewReplacement => entry.slot === "document.preview",
	);
