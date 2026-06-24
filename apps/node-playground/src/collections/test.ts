import { CollectionBuilder, copy, z } from "@lucidcms/core";
import IntroBrick from "../bricks/intro.js";

const TestCollection = new CollectionBuilder("test", {
	mode: "multiple",
	details: {
		name: copy("admin:collections.test.name"),
		singularName: copy("admin:collections.test.singularName"),
		summary: copy("admin:collections.test.summary"),
	},
	features: {
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
		label: copy("admin:collections.test.fields.title.label"),
	},
	config: {
		hidden: false,
		disabled: false,
	},
	validation: {
		required: true,
		zod: z.string().min(2).max(128),
	},
	listing: true,
});

export default TestCollection;
