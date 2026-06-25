import { BrickBuilder } from "@lucidcms/core";

const SimpleFixedBrick = new BrickBuilder("simple-fixed", {
	// tenants: ["documentation"],
}).addText("heading", {
	localized: false,
});

export default SimpleFixedBrick;
