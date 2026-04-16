import { BrickBuilder } from "@lucidcms/core/builders";

const TextareaBrick = new BrickBuilder("textarea", {
	details: {
		name: "Textarea",
	},
})
	.addTab("contentTab", {
		details: {
			label: "Content",
		},
	})
	.addText("heading", {
		details: {
			label: "Heading",
		},
	})
	.addRichText("content", {
		details: {
			label: "Content",
		},
	})
	.addTab("optionsTab", {
		details: {
			label: "Options",
		},
	})
	.addCheckbox("isFullWidth", {
		details: {
			label: "Full Width",
		},
	});

export default TextareaBrick;
