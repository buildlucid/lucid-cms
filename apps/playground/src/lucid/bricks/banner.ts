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
		labels: {
			title: "Content",
		},
	})
	.addText("title", {
		labels: {
			description: "The title of the banner. This is displayed as an H1 tag.",
		},
		validation: {
			required: true,
		},
	})
	.addWysiwyg("intro")
	.addRepeater("call_to_actions", {
		labels: {
			title: "Call to Actions",
		},
		validation: {
			maxGroups: 3,
		},
	})
	.addLink("link", {
		labels: {
			title: "Link",
		},
	})
	.endRepeater()
	.addTab("config_tab", {
		labels: {
			title: "Config",
		},
	})
	.addCheckbox("full_width", {
		labels: {
			description: "Make the banner fullwidth",
		},
	});

export default BannerBrick;
