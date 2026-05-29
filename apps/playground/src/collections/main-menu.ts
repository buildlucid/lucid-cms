import { CollectionBuilder, copy } from "@lucidcms/core";

const MainMenuCollection = new CollectionBuilder("main-menu", {
	mode: "single",
	details: {
		name: copy("admin:collections.main-menu.name", {
			defaultMessage: "Main Menu",
		}),
		singularName: copy("admin:collections.main-menu.singularName", {
			defaultMessage: "Main Menu",
		}),
		summary: copy("admin:collections.main-menu.summary", {
			defaultMessage: "The main menu for your website.",
		}),
	},
	config: {
		revisions: true,
		localized: true,
	},
})
	.addRepeater("items", {
		details: {
			label: copy("admin:collections.main-menu.fields.items.label", {
				defaultMessage: "Items",
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
