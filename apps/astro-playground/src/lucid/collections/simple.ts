import { CollectionBuilder, text, z } from "@lucidcms/core";
import SimpleBrick from "../bricks/simple.js";
import SimpleFixedBrick from "../bricks/simple-fixed.js";

const SimpleCollection = new CollectionBuilder("simple", {
	mode: "multiple",
	details: {
		name: text.admin("collections.simple.name", { defaultMessage: "Simple" }),
		singularName: text.admin("collections.simple.singularName", {
			defaultMessage: "Simple",
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
			label: text.admin("collections.simple.fields.simpleHeading.label", {
				defaultMessage: "Heading Default",
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
