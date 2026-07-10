import { CollectionBuilder, copy, z } from "@lucidcms/core";
import SimpleBrick from "../bricks/simple.js";
import SimpleFixedBrick from "../bricks/simple-fixed.js";

const SimpleCollection = new CollectionBuilder("simple", {
	mode: "multiple",
	details: {
		name: copy("admin:collections.simple.name"),
		singularName: copy("admin:collections.simple.singularName"),
	},
	localized: true,
	revisions: true,
	bricks: {
		builder: [SimpleBrick, SimpleFixedBrick],
		fixed: [SimpleFixedBrick],
	},
})
	.addText("simpleHeading", {
		details: {
			label: copy("admin:collections.simple.fields.simpleHeading.label"),
		},
		validation: {
			required: true,
			zod: z.string().min(2).max(128),
		},
		showInList: true,
	})
	.addUser("user")
	.addMedia("media")
	.addRange("priceRange", {
		details: {
			label: copy("admin:collections.simple.fields.priceRange.label"),
			summary: copy("admin:collections.simple.fields.priceRange.summary"),
		},
		min: 0,
		max: 100,
		step: 0.5,
		thumbs: 2,
		default: [20, 80],
		showInList: true,
	})
	.addRepeater("people")
	.addText("firstName")
	.endRepeater();

export default SimpleCollection;
