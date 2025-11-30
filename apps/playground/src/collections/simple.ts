import { z } from "@lucidcms/core";
import { CollectionBuilder } from "@lucidcms/core/builders";
import SimpleBrick from "../bricks/simple.js";
import SimpleFixedBrick from "../bricks/simple-fixed.js";

const SimpleCollection = new CollectionBuilder("simple", {
	mode: "multiple",
	details: {
		name: "Simple",
		singularName: "Simple",
	},
	config: {
		useTranslations: true,
		useRevisions: true,
	},
	bricks: {
		builder: [SimpleBrick, SimpleFixedBrick],
		fixed: [SimpleFixedBrick],
	},
})
	.addText("simpleHeading", {
		details: {
			label: {
				en: "Heading Default",
			},
		},
		validation: {
			required: true,
			zod: z.string().min(2).max(128),
		},
		displayInListing: true,
	})
	.addUser("user")
	.addMedia("media")
	.addRepeater("people")
	.addText("firstName")
	.endRepeater();

export default SimpleCollection;
