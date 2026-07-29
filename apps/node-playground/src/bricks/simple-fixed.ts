import { BrickBuilder } from "@lucidcms/core";

const SimpleFixedBrick = new BrickBuilder("simple-fixed", {
}).addText("heading", {
	localized: false,
});

export default SimpleFixedBrick;
