import { defineBrick, defineCollection, field } from "@lucidcms/core";

export const RESTRICTED_STORY_KEY = "restricted-story";

/** A builder brick only people with its read permission see. */
export const PanelBrick = defineBrick({
	key: "restricted-panel",
	details: { label: "Panel" },
	permissions: { read: true },
	fields: [field.text("panel_text")],
});

/** A builder brick anyone can see, with one field only some people may change. */
export const NoteBrick = defineBrick({
	key: "restricted-note",
	details: { label: "Note" },
	fields: [
		field.text("note_text"),
		field.text("note_locked", { permissions: { update: true } }),
	],
});

/**
 * Shared field-access fixture. Read permissions hide `notes`, `credits` and the panel brick;
 * update permission locks `price`.
 */
const RestrictedStoryCollection = defineCollection({
	key: RESTRICTED_STORY_KEY,
	mode: "multiple",
	details: {
		labels: { singular: "Restricted story", plural: "Restricted stories" },
	},
	fields: [
		field.text("title", { showInList: true, useAsLabel: true }),
		field.text("notes", { permissions: { read: true }, index: true }),
		field.number("price", { permissions: { update: true } }),
		field.repeater("credits", {
			permissions: { read: true },
			fields: [field.text("credit_name")],
		}),
	],
	bricks: {
		builder: [PanelBrick, NoteBrick],
	},
});

export default RestrictedStoryCollection;
