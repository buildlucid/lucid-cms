import { BrickBuilder, copy } from "@lucidcms/core";

const TestingBrick = new BrickBuilder("testing", {
	preview: {
		image:
			"https://usersnap.com/blog/wp-content/uploads/2021/03/7-Common-Types-of-Software-Testing@1x-1280x720.png",
	},
})
	.addTab("content_tab", {
		details: {
			label: copy("admin:bricks.testing.tabs.content_tab.label", {
				defaultMessage: "Content",
			}),
		},
	})
	.addText("text-key", {
		details: {
			label: copy("admin:bricks.testing.fields.text-key.label", {
				defaultMessage: "Text",
			}),
			summary: copy("admin:bricks.testing.fields.text-key.summary", {
				defaultMessage: "Testing title",
			}),
			placeholder: copy("admin:bricks.testing.fields.text-key.placeholder", {
				defaultMessage: "Testing title",
			}),
		},
	})
	.addRichText("rich-text-key")
	.addMedia("media-key", {
		validation: {
			extensions: ["png"],
			type: "image",
		},
	})
	.addRepeater("repeater-key")
	.addText("repeater-title")
	.addRepeater("repeater-key-nested")
	.addText("repeater-title-nested")
	.endRepeater()
	.endRepeater()
	.addNumber("number-key")
	.addCheckbox("checkbox-key", {
		details: {
			label: copy("admin:bricks.testing.fields.checkbox-key.label", {
				defaultMessage: "Checkbox",
			}),
			true: copy("admin:bricks.testing.fields.checkbox-key.trueLabel", {
				defaultMessage: "Show",
			}),
			false: copy("admin:bricks.testing.fields.checkbox-key.falseLabel", {
				defaultMessage: "Hide",
			}),
		},
	})
	.addSelect("select-key", {
		options: [
			{
				label: copy("admin:bricks.testing.fields.select-key.options.option-1.label",
					{ defaultMessage: "Option 1" },
				),
				value: "option-1",
			},
			{
				label: copy("admin:bricks.testing.fields.select-key.options.option-2.label",
					{ defaultMessage: "Option 2" },
				),
				value: "option-2",
			},
			{
				label: copy("admin:bricks.testing.fields.select-key.options.option-3.label",
					{ defaultMessage: "Option 3" },
				),
				value: "option-3",
			},
		],
		validation: {
			required: true,
		},
	})
	.addTextarea("textarea-key", {
		details: {
			label: copy("admin:bricks.testing.fields.textarea-key.label", {
				defaultMessage: "Textarea",
			}),
			placeholder: copy("admin:bricks.testing.fields.textarea-key.placeholder",
				{ defaultMessage: "Testing textarea" },
			),
			summary: copy("admin:bricks.testing.fields.textarea-key.summary", {
				defaultMessage: "Testing textarea",
			}),
		},
	})
	.addTab("advanced_tab", {
		details: {
			label: copy("admin:bricks.testing.tabs.advanced_tab.label", {
				defaultMessage: "Advanced",
			}),
		},
	})
	.addJSON("json-key")
	.addColor("color-key", {
		presets: ["#000000", "#ffffff"],
	})
	.addDateTime("datetime-key")
	.addLink("link-key");

export default TestingBrick;
