import { BrickBuilder } from "@lucidcms/core";

const SimpleFixedBrick = new BrickBuilder("simple-fixed").addText("heading", {
	config: {
		useTranslations: false,
	},
});

export default SimpleFixedBrick;
