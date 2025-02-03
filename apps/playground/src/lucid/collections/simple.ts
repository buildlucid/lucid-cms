import { z } from "@lucidcms/core";
import { CollectionBuilder } from "@lucidcms/core/builders";
import SimpleBrick from "../bricks/simple.js";

const SimpleCollection = new CollectionBuilder("simple", {
	mode: "multiple",
	details: {
		name: "Simple",
		singularName: "Simple",
	},
	config: {
		useTranslations: true,
		useDrafts: true,
		useRevisions: true,
	},
	bricks: {
		builder: [SimpleBrick],
	},
}).addText("simpleHeading", {
	details: {
		label: {
			en: "Heading Default",
		},
	},
	validation: {
		required: true,
		zod: z.string().min(2).max(128),
	},
	collection: {
		column: true,
		filterable: true,
	},
});

export default SimpleCollection;
