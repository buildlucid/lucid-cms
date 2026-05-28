import { adminText, CollectionBuilder, z } from "@lucidcms/core";
import IntroBrick from "../bricks/intro.js";

const TestCollection = new CollectionBuilder("test", {
	mode: "multiple",
	details: {
		name: adminText("collections.test.name", {
			fallback: "Test",
		}),
		singularName: adminText("collections.test.singularName", {
			fallback: "Test",
		}),
		summary: adminText("collections.test.summary", {
			fallback:
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
		label: adminText("collections.test.fields.title.label", {
			fallback: "Title",
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
