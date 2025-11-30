import { z } from "@lucidcms/core";
import { CollectionBuilder } from "@lucidcms/core/builders";
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
		useTranslations: false,
		useRevisions: true,
		isLocked: false,
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
		isHidden: false,
		isDisabled: false,
	},
	validation: {
		required: true,
		zod: z.string().min(2).max(128),
	},
	displayInListing: true,
});

export default TestCollection;
