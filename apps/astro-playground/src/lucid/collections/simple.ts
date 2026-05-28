import { adminText, CollectionBuilder, z } from "@lucidcms/core";
import SimpleBrick from "../bricks/simple.js";
import SimpleFixedBrick from "../bricks/simple-fixed.js";

const SimpleCollection = new CollectionBuilder("simple", {
	mode: "multiple",
	details: {
		name: adminText("collections.simple.name", { fallback: "Simple" }),
		singularName: adminText("collections.simple.singularName", {
			fallback: "Simple",
		}),
	},
	config: {
		localized: true,
		revisions: true,
	},
	bricks: {
		builder: [SimpleBrick, SimpleFixedBrick],
		fixed: [SimpleFixedBrick],
	},
})
	.addText("simpleHeading", {
		details: {
			label: adminText("collections.simple.fields.simpleHeading.label", {
				fallback: "Heading Default",
			}),
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
