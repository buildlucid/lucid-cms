import { BrickBuilder } from "@lucidcms/core/builders";

const SimpleBrick = new BrickBuilder("simple")
	.addText("heading", {
		config: {
			useTranslations: false,
		},
	})
	.addRepeater("items")
	.addText("itemTitle")
	.addRepeater("nestedItems")
	.addText("nestedItemTitle")
	.endRepeater()
	.endRepeater();

export default SimpleBrick;
