import { defineBrick, field } from "@lucidcms/core";

const SimpleFixedBrick = defineBrick({
	key: "simple-fixed",
	fields: [
		field.text("heading", {
			localized: false,
		}),
	],
});

export default SimpleFixedBrick;
