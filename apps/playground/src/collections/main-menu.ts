import { CollectionBuilder } from "@lucidcms/core";

const MainMenuCollection = new CollectionBuilder("main-menu", {
	mode: "single",
	details: {
		name: "Main Menu",
		singularName: "Main Menu",
		summary: "The main menu for your website.",
	},
	config: {
		revisions: true,
		translations: true,
	},
})
	.addRepeater("items", {
		details: {
			label: "Items",
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
