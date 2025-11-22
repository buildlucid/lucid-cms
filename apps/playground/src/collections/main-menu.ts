import { CollectionBuilder } from "@lucidcms/core/builders";

const MainMenuCollection = new CollectionBuilder("main-menu", {
	mode: "single",
	details: {
		name: "Main Menu",
		singularName: "Main Menu",
		summary: "The main menu for your website.",
	},
	config: {
		useRevisions: true,
		useTranslations: true,
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
		collection: "page",
	})
	.endRepeater();

export default MainMenuCollection;
