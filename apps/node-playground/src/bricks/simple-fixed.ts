import { BrickBuilder } from "@lucidcms/core";

const SimpleFixedBrick = new BrickBuilder("simple-fixed", {
	// tenants: ["documentation"],
}).addText("heading", {
	config: {
		localized: false,
	},
});

export default SimpleFixedBrick;
