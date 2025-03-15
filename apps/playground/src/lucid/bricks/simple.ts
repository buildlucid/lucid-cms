import { z } from "@lucidcms/core";
import { BrickBuilder } from "@lucidcms/core/builders";

const SimpleBrick = new BrickBuilder("simple")
	.addText("heading", {
		config: {
			useTranslations: false,
		},
	})
	.addDocument("document", {
		collection: "simple",
		validation: {
			// required: true,
		},
	})
	.addRepeater("items")
	.addText("itemTitle")
	.addRepeater("nestedItems")
	.addText("nestedItemTitle")
	.addCheckbox("nestedCheckbox")
	.endRepeater()
	.endRepeater();

export default SimpleBrick;
