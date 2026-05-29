import { BrickBuilder, text } from "@lucidcms/core";

const BannerBrick = new BrickBuilder("banner", {
	details: {
		name: text.admin("bricks.banner.name", { defaultMessage: "Banner" }),
		summary: text.admin("bricks.banner.summary", {
			defaultMessage: "A banner with a title and intro text",
		}),
	},
	preview: {
		image: "https://headless-dev.up.railway.app/public/banner-brick.png",
	},
})
	.addTab("content_tab", {
		details: {
			label: text.admin("bricks.banner.tabs.content_tab.label", {
				defaultMessage: "Content",
			}),
		},
	})
	.addText("title", {
		details: {
			summary: text.admin("bricks.banner.fields.title.summary", {
				defaultMessage:
					"The title of the banner. This is displayed as an H1 tag.",
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
			label: text.admin("bricks.banner.fields.call_to_actions.label", {
				defaultMessage: "Call to Actions",
			}),
		},
		validation: {
			maxGroups: 3,
		},
	})
	.addText("call_to_action_title", {
		details: {
			label: text.admin("bricks.banner.fields.call_to_action_title.label", {
				defaultMessage: "Link Text",
			}),
		},
	})
	.addLink("link", {
		details: {
			label: text.admin("bricks.banner.fields.link.label", {
				defaultMessage: "Link",
			}),
		},
	})
	.addRepeater("nested_repeater")
	.addText("nested_title")
	.endRepeater()
	.endRepeater()
	.addTab("config_tab", {
		details: {
			label: text.admin("bricks.banner.tabs.config_tab.label", {
				defaultMessage: "Config",
			}),
		},
	})
	.addCheckbox("full_width", {
		details: {
			summary: text.admin("bricks.banner.fields.full_width.summary", {
				defaultMessage: "Make the banner fullwidth",
			}),
		},
	});

export default BannerBrick;
