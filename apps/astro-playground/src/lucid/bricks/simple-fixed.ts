import { adminText, BrickBuilder } from "@lucidcms/core";

const SimpleFixedBrick = new BrickBuilder("simple-fixed").addText("heading", {
	config: {
		localized: false,
	},
});

export default SimpleFixedBrick;
