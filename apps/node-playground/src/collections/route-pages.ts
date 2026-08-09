import { CollectionBuilder, copy, z } from "@lucidcms/core";

const RoutePageCollection = new CollectionBuilder("route-page", {
	mode: "multiple",
	details: {
		name: copy("admin:collections.route-page.name"),
		singularName: copy("admin:collections.route-page.singularName"),
		summary: copy("admin:collections.route-page.summary"),
	},
	group: { key: "content" },
	localized: true,
}).addText("title", {
	details: {
		label: copy("admin:collections.route-page.fields.title.label"),
	},
	validation: {
		required: true,
		zod: z.string().min(2),
	},
	showInList: true,
	useAsLabel: true,
});

export default RoutePageCollection;
