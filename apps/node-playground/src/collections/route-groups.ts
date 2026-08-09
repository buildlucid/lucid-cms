import { CollectionBuilder, copy, z } from "@lucidcms/core";

const RouteGroupCollection = new CollectionBuilder("route-group", {
	mode: "multiple",
	details: {
		name: copy("admin:collections.route-group.name"),
		singularName: copy("admin:collections.route-group.singularName"),
		summary: copy("admin:collections.route-group.summary"),
	},
	group: { key: "content" },
	localized: true,
})
	.addText("route_key", {
		details: {
			label: copy("admin:collections.route-group.fields.route_key.label"),
		},
		validation: {
			required: true,
			zod: z.string().regex(/^[a-zA-Z0-9_-]+$/),
		},
		showInList: true,
		useAsLabel: true,
	})
	.addText("title", {
		details: {
			label: copy("admin:collections.route-group.fields.title.label"),
		},
	});

export default RouteGroupCollection;
