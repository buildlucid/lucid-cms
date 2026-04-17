import { BrickBuilder } from "@lucidcms/core";

const SimpleBrick = new BrickBuilder("simple")
	.addText("heading", {
		config: {
			useTranslations: false,
		},
	})
	.addMedia("image")
	.addDocument("document", {
		collection: "simple",
		validation: {
			// required: true,
		},
	})
	.addRepeater("items")
	.addText("itemTitle")
	.addRepeater("nestedItems")
	.addText("nestedItemTitle", {
		validation: {
			required: true,
		},
	})
	.addCheckbox("nestedCheckbox")
	.endRepeater()
	.endRepeater();

export default SimpleBrick;
