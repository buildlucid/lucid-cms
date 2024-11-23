import { BrickBuilder } from "@lucidcms/core/builders";

const IntroBrick = new BrickBuilder("intro", {
	details: {
		name: "Intro",
	},
})
	.addTab("content_tab", {
		labels: {
			title: "Content",
		},
	})
	.addText("title")
	.addWysiwyg("intro")
	.addTab("advanced_tab", {
		labels: {
			title: "Advanced",
		},
	})
	.addJSON("json", {
		labels: {
			title: "JSON",
		},
		validation: {
			required: true,
		},
	});

export default IntroBrick;
