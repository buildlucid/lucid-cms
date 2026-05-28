import { adminText, BrickBuilder } from "@lucidcms/core";

const BannerBrick = new BrickBuilder("banner", {
	details: {
		name: adminText("bricks.banner.name", {
			fallback: "Banner",
		}),
		summary: adminText("bricks.banner.summary", {
			fallback: "A banner with a title and intro text",
		}),
	},
	preview: {
		image: "https://headless-dev.up.railway.app/public/banner-brick.png",
	},
})
	.addTab("content_tab", {
		details: {
			label: adminText("bricks.banner.tabs.content_tab.label", {
				fallback: "Content",
			}),
		},
	})
	.addText("title", {
		details: {
			summary: adminText("bricks.banner.fields.title.summary", {
				fallback: "The title of the banner. This is displayed as an H1 tag.",
			}),
		},
		config: {
			default: "Welcome to our website",
		},
		validation: {
			required: true,
		},
	})
	.addRichText("intro")
	.addRepeater("call_to_actions", {
		details: {
			label: adminText("bricks.banner.fields.call_to_actions.label", {
				fallback: "Call to Actions",
			}),
		},
		validation: {
			maxGroups: 3,
		},
	})
	.addText("call_to_action_title", {
		details: {
			label: adminText("bricks.banner.fields.call_to_action_title.label", {
				fallback: "Link Text",
			}),
		},
	})
	.addLink("link", {
		details: {
			label: adminText("bricks.banner.fields.link.label", {
				fallback: "Link",
			}),
		},
	})
	.addRepeater("nested_repeater")
	.addText("nested_title")
	.endRepeater()
	.endRepeater()
	.addTab("config_tab", {
		details: {
			label: adminText("bricks.banner.tabs.config_tab.label", {
				fallback: "Config",
			}),
		},
	})
	.addCheckbox("full_width", {
		details: {
			summary: adminText("bricks.banner.fields.full_width.summary", {
				fallback: "Make the banner fullwidth",
			}),
		},
	});

export default BannerBrick;
