import { copy, defineCollection, field, z } from "@lucidcms/core";
import SimpleFixedBrick from "../bricks/simple-fixed.js";
import SimpleBrick from "../bricks/simple.js";

const SimpleCollection = defineCollection({
	key: "simple",
	mode: "multiple",
	details: {
		labels: {
			singular: copy("admin:collections.simple.singularName"),
			plural: copy("admin:collections.simple.name"),
		},
	},
	localized: { locales: ["fr"], defaultLocale: "fr" },
	revisions: true,
	bricks: {
		builder: [SimpleBrick, SimpleFixedBrick],
		fixed: [SimpleFixedBrick],
	},
	fields: [
		field.text("simpleHeading", {
			details: {
				label: copy("admin:collections.simple.fields.simpleHeading.label"),
			},
			validation: {
				required: true,
				zod: z.string().min(2).max(128),
			},
			showInList: true,
		}),
		field.user("user"),
		field.media("media"),
		field.range("priceRange", {
			details: {
				label: copy("admin:collections.simple.fields.priceRange.label"),
				description: copy("admin:collections.simple.fields.priceRange.summary"),
			},
			min: 0,
			max: 100,
			step: 0.5,
			thumbs: 2,
			default: [20, 80],
			showInList: true,
		}),
		field.repeater("people", { fields: [field.text("firstName")] }),
	],
});

export default SimpleCollection;
