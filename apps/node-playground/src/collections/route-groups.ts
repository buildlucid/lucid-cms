import { copy, defineCollection, field, z } from "@lucidcms/core";

const RouteGroupCollection = defineCollection({
	key: "route-group",
	mode: "multiple",
	details: {
		labels: {
			singular: copy("admin:collections.route-group.singularName"),
			plural: copy("admin:collections.route-group.name"),
		},
		description: copy("admin:collections.route-group.summary"),
	},
	group: { key: "content" },
	localized: true,
	fields: [
		field.text("route_key", {
			details: {
				label: copy("admin:collections.route-group.fields.route_key.label"),
			},
			validation: {
				required: true,
				zod: z.string().regex(/^[a-zA-Z0-9_-]+$/),
			},
			showInList: true,
			useAsLabel: true,
		}),
		field.text("title", {
			details: {
				label: copy("admin:collections.route-group.fields.title.label"),
			},
		}),
	],
});

export default RouteGroupCollection;
