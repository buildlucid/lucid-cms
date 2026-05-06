import { BrickBuilder } from "@lucidcms/core";

const SimpleFixedBrick = new BrickBuilder("simple-fixed").addText("heading", {
	config: {
		translations: false,
	},
});

export default SimpleFixedBrick;
