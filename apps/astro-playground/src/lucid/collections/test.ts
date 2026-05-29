import { CollectionBuilder, text, z } from "@lucidcms/core";
import IntroBrick from "../bricks/intro.js";

const TestCollection = new CollectionBuilder("test", {
	mode: "multiple",
	details: {
		name: text.admin("collections.test.name", { defaultMessage: "Test" }),
		singularName: text.admin("collections.test.singularName", {
			defaultMessage: "Test",
		}),
		summary: text.admin("collections.test.summary", {
			defaultMessage:
				"A test collection for the revisions and draft/published functionality.",
		}),
	},
	config: {
		localized: false,
		revisions: true,
		locked: false,
	},
	hooks: [],
	bricks: {
		builder: [IntroBrick],
	},
}).addText("title", {
	details: {
		label: text.admin("collections.test.fields.title.label", {
			defaultMessage: "Title",
		}),
	},
	config: {
		hidden: false,
		disabled: false,
	},
	validation: {
		required: true,
		zod: z.string().min(2).max(128),
	},
	displayInListing: true,
});

export default TestCollection;
