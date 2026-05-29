import { BrickBuilder, copy } from "@lucidcms/core";

const IntroBrick = new BrickBuilder("intro", {
	details: {
		name: copy("admin:bricks.intro.name", { defaultMessage: "Intro" }),
	},
})
	.addTab("content_tab", {
		details: {
			label: copy("admin:bricks.intro.tabs.content_tab.label", {
				defaultMessage: "Content",
			}),
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
			label: copy("admin:bricks.intro.tabs.advanced_tab.label", {
				defaultMessage: "Advanced",
			}),
		},
	})
	.addJSON("json", {
		details: {
			label: copy("admin:bricks.intro.fields.json.label", {
				defaultMessage: "JSON",
			}),
		},
		validation: {
			required: true,
		},
	});

export default IntroBrick;
