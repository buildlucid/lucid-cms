import { BrickBuilder } from "@lucidcms/core/builders";

const IntroBrick = new BrickBuilder("intro", {
	details: {
		name: "Intro",
	},
})
	.addTab("content_tab", {
		details: {
			label: "Content",
		},
	})
	.addText("title", {
		config: {
			useTranslations: true,
		},
	})
	.addWysiwyg("intro")
	.addTab("advanced_tab", {
		details: {
			label: "Advanced",
		},
	})
	.addJSON("json", {
		details: {
			label: "JSON",
		},
		validation: {
			required: true,
		},
	});

export default IntroBrick;
