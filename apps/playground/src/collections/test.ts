import { CollectionBuilder, z } from "@lucidcms/core";
import IntroBrick from "../bricks/intro.js";

const TestCollection = new CollectionBuilder("test", {
	mode: "multiple",
	details: {
		name: "Test",
		singularName: "Test",
		summary:
			"A test collection for the revisions and draft/published functionality.",
	},
	config: {
		translations: false,
		revisions: true,
		locked: false,
	},
	hooks: [],
	bricks: {
		builder: [IntroBrick],
	},
}).addText("title", {
	details: {
		label: {
			en: "Title",
		},
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
