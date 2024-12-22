import { BrickBuilder } from "@lucidcms/core/builders";

const BannerBrick = new BrickBuilder("banner", {
	details: {
		name: {
			en: "Banner",
		},
		summary: "A banner with a title and intro text",
	},
	preview: {
		image: "https://headless-dev.up.railway.app/public/banner-brick.png",
	},
})
	.addTab("content_tab", {
		details: {
			label: "Content",
		},
	})
	.addText("title", {
		details: {
			summary: "The title of the banner. This is displayed as an H1 tag.",
		},
		config: {
			default: "Welcome to our website",
		},
		validation: {
			required: true,
		},
	})
	.addWysiwyg("intro")
	.addRepeater("call_to_actions", {
		details: {
			label: "Call to Actions",
		},
		validation: {
			maxGroups: 3,
		},
	})
	.addLink("link", {
		details: {
			label: "Link",
		},
	})
	.endRepeater()
	.addTab("config_tab", {
		details: {
			label: "Config",
		},
	})
	.addCheckbox("full_width", {
		details: {
			summary: "Make the banner fullwidth",
		},
	});

export default BannerBrick;
