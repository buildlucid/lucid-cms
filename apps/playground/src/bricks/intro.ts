import { adminText, BrickBuilder } from "@lucidcms/core";

const IntroBrick = new BrickBuilder("intro", {
	details: {
		name: adminText("bricks.intro.name", {
			fallback: "Intro",
		}),
	},
})
	.addTab("content_tab", {
		details: {
			label: adminText("bricks.intro.tabs.content_tab.label", {
				fallback: "Content",
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
			label: adminText("bricks.intro.tabs.advanced_tab.label", {
				fallback: "Advanced",
			}),
		},
	})
	.addJSON("json", {
		details: {
			label: adminText("bricks.intro.fields.json.label", {
				fallback: "JSON",
			}),
		},
		validation: {
			required: true,
		},
	});

export default IntroBrick;
