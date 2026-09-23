import { BrickBuilder } from "@lucidcms/core";

const RichTextCalloutBrick = new BrickBuilder("rt-callout", {})
	.addText("heading")
	.addTextarea("body", {
		validation: {
			required: true,
		},
	})
	.addCheckbox("emphasised");

export default RichTextCalloutBrick;
