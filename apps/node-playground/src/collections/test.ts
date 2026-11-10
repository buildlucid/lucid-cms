import { copy, defineCollection, field, z } from "@lucidcms/core";
import IntroBrick from "../bricks/intro.js";

const TestCollection = defineCollection({
	key: "test",
	mode: "multiple",
	details: {
		labels: {
			singular: copy("admin:collections.test.singularName"),
			plural: copy("admin:collections.test.name"),
		},
		description: copy("admin:collections.test.summary"),
	},
	localized: false,
	revisions: true,
	locked: false,
	hooks: [],
	bricks: {
		builder: [IntroBrick],
	},
	fields: [
		field.text("title", {
			details: {
				label: copy("admin:collections.test.fields.title.label"),
			},
			ui: {
				hidden: false,
				disabled: false,
			},
			validation: {
				required: true,
				zod: z.string().min(2).max(128),
			},
			showInList: true,
		}),
	],
});

export default TestCollection;
