import { CollectionBuilder, copy } from "@lucidcms/core";

const MainMenuCollection = new CollectionBuilder("main-menu", {
	mode: "single",
	details: {
		name: copy("admin:collections.main-menu.name"),
		singularName: copy("admin:collections.main-menu.singularName"),
		summary: copy("admin:collections.main-menu.summary"),
	},
	revisions: true,
	localized: true,
})
	.addRepeater("items", {
		details: {
			label: copy("admin:collections.main-menu.fields.items.label"),
		},
		validation: {
			maxGroups: 5,
		},
	})
	.addDocument("item", {
		collection: ["page", "blog"],
		multiple: true,
	})
	.endRepeater();

export default MainMenuCollection;
