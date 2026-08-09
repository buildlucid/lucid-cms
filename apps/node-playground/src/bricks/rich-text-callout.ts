import { BrickBuilder } from "@lucidcms/core";

const RichTextCalloutBrick = new BrickBuilder("rt-callout", {})
	.addText("heading")
	.addTextarea("body")
	.addCheckbox("emphasised");

export default RichTextCalloutBrick;
