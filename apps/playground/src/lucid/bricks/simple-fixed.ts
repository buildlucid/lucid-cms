import { BrickBuilder } from "@lucidcms/core/builders";

const SimpleFixedBrick = new BrickBuilder("simple-fixed").addText("heading", {
	config: {
		useTranslations: false,
	},
});

export default SimpleFixedBrick;
