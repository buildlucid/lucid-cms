import { BrickBuilder } from "@lucidcms/core";

const SimpleFixedBrick = new BrickBuilder("simple-fixed", {
	// tenantKeys: ["documentation"],
}).addText("heading", {
	config: {
		localized: false,
	},
});

export default SimpleFixedBrick;
