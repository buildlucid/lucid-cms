import { BrickBuilder, copy } from "@lucidcms/core";

const BannerBrick = new BrickBuilder("banner", {
	details: {
		name: copy("admin:bricks.banner.name"),
		summary: copy("admin:bricks.banner.summary"),
	},
	preview: {
		image: "https://headless-dev.up.railway.app/public/banner-brick.png",
	},
})
	.addTab("content_tab", {
		details: {
			label: copy("admin:bricks.banner.tabs.content_tab.label"),
		},
	})
	.addText("title", {
		details: {
			summary: copy("admin:bricks.banner.fields.title.summary"),
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
			label: copy("admin:bricks.banner.fields.call_to_actions.label"),
		},
		validation: {
			maxGroups: 3,
		},
	})
	.addText("call_to_action_title", {
		details: {
			label: copy("admin:bricks.banner.fields.call_to_action_title.label"),
		},
	})
	.addLink("link", {
		details: {
			label: copy("admin:bricks.banner.fields.link.label"),
		},
	})
	.addRepeater("nested_repeater")
	.addText("nested_title")
	.endRepeater()
	.endRepeater()
	.addTab("config_tab", {
		details: {
			label: copy("admin:bricks.banner.tabs.config_tab.label"),
		},
	})
	.addCheckbox("full_width", {
		details: {
			summary: copy("admin:bricks.banner.fields.full_width.summary"),
		},
	});

export default BannerBrick;
