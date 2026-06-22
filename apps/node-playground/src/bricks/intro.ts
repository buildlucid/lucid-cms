import { BrickBuilder, copy } from "@lucidcms/core";

const IntroBrick = new BrickBuilder("intro", {
	details: {
		name: copy("admin:bricks.intro.name"),
	},
})
	.addTab("content_tab", {
		details: {
			label: copy("admin:bricks.intro.tabs.content_tab.label"),
		},
	})
	.addText("title", {
		config: {
			localized: true,
		},
	})
	.addRichText("intro")
	.addTab("advanced_tab", {
		details: {
			label: copy("admin:bricks.intro.tabs.advanced_tab.label"),
		},
	})
	.addJSON("json", {
		details: {
			label: copy("admin:bricks.intro.fields.json.label"),
		},
		validation: {
			required: true,
		},
	});

export default IntroBrick;
