import { adminText, CollectionBuilder } from "@lucidcms/core";

const MainMenuCollection = new CollectionBuilder("main-menu", {
	mode: "single",
	details: {
		name: adminText("collections.main-menu.name", {
			fallback: "Main Menu",
		}),
		singularName: adminText("collections.main-menu.singularName", {
			fallback: "Main Menu",
		}),
		summary: adminText("collections.main-menu.summary", {
			fallback: "The main menu for your website.",
		}),
	},
	config: {
		revisions: true,
		localized: true,
	},
})
	.addRepeater("items", {
		details: {
			label: adminText("collections.main-menu.fields.items.label", {
				fallback: "Items",
			}),
		},
		validation: {
			maxGroups: 5,
		},
	})
	.addDocument("item", {
		collection: ["page", "blog"],
		config: {
			multiple: true,
		},
	})
	.endRepeater();

export default MainMenuCollection;
