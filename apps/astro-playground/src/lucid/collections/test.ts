import { CollectionBuilder, copy, z } from "@lucidcms/core";
import IntroBrick from "../bricks/intro.js";

const TestCollection = new CollectionBuilder("test", {
	mode: "multiple",
	details: {
		name: copy("admin:collections.test.name", { defaultMessage: "Test" }),
		singularName: copy("admin:collections.test.singularName", {
			defaultMessage: "Test",
		}),
		summary: copy("admin:collections.test.summary", {
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
		label: copy("admin:collections.test.fields.title.label", {
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
