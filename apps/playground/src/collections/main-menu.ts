import { CollectionBuilder, text } from "@lucidcms/core";

const MainMenuCollection = new CollectionBuilder("main-menu", {
	mode: "single",
	details: {
		name: text.admin("collections.main-menu.name", {
			defaultMessage: "Main Menu",
		}),
		singularName: text.admin("collections.main-menu.singularName", {
			defaultMessage: "Main Menu",
		}),
		summary: text.admin("collections.main-menu.summary", {
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
			label: text.admin("collections.main-menu.fields.items.label", {
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
