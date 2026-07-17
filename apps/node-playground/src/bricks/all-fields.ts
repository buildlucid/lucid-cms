import { BrickBuilder } from "@lucidcms/core";

const AllFieldsBrick = new BrickBuilder("all-fields", {
	details: {
		name: "All custom fields",
		summary:
			"Exercises every built-in field and structural field in the builder.",
	},
})
	.addTab("content", {
		details: {
			label: "Content",
		},
	})
	.addText("localized_required_text", {
		details: {
			label: "Localized required text",
		},
		localized: true,
		validation: {
			required: true,
		},
	})
	.addText("shared_text", {
		details: {
			label: "Shared text",
		},
		localized: false,
	})
	.addTextarea("textarea", {
		localized: true,
	})
	.addRichText("rich_text", {
		localized: true,
	})
	.addNumber("number", {
		localized: false,
		validation: {
			required: true,
		},
	})
	.addRange("range", {
		default: [25, 75],
		localized: false,
		min: 0,
		max: 100,
		step: 5,
		thumbs: 2,
	})
	.addCheckbox("checkbox", {
		localized: false,
	})
	.addSelect("localized_required_select", {
		details: {
			label: "Localized required select",
		},
		localized: true,
		options: [
			{
				label: "First option",
				value: "first",
			},
			{
				label: "Second option",
				value: "second",
			},
		],
		validation: {
			required: true,
		},
	})
	.addDateTime("datetime", {
		localized: false,
	})
	.addColor("color", {
		localized: false,
		presets: ["#2563eb", "#16a34a", "#dc2626"],
	})
	.addTab("structure", {
		details: {
			label: "Structure",
		},
	})
	.addSection("section", {
		details: {
			label: "Section",
		},
	})
	.addText("section_text", {
		localized: true,
	})
	.endSection()
	.addCollapsible("collapsible", {
		defaultOpen: false,
		details: {
			label: "Collapsible",
		},
	})
	.addText("collapsible_text", {
		localized: false,
	})
	.endCollapsible()
	.addRepeater("items", {
		validation: {
			minGroups: 1,
			maxGroups: 3,
		},
	})
	.addText("item_title", {
		details: {
			label: "Item title",
		},
		localized: true,
		validation: {
			required: true,
		},
	})
	.addCheckbox("item_enabled", {
		localized: false,
	})
	.addRepeater("nested_items", {
		validation: {
			maxGroups: 2,
		},
	})
	.addText("nested_item_title", {
		details: {
			label: "Nested item title",
		},
		localized: true,
		validation: {
			required: true,
		},
	})
	.addSelect("nested_item_select", {
		details: {
			label: "Nested item select",
		},
		localized: true,
		options: [
			{
				label: "Alpha",
				value: "alpha",
			},
			{
				label: "Beta",
				value: "beta",
			},
		],
		validation: {
			required: true,
		},
	})
	.endRepeater()
	.endRepeater()
	.addTab("references", {
		details: {
			label: "References",
		},
	})
	.addMedia("media", {
		localized: false,
		multiple: true,
	})
	.addRelation("related_pages", {
		collection: "page",
		localized: false,
		multiple: true,
	})
	.addUser("users", {
		localized: false,
		multiple: true,
	})
	.addLink("required_link", {
		localized: false,
		validation: {
			required: true,
		},
	})
	.addTab("technical", {
		details: {
			label: "Technical",
		},
	})
	.addJSON("json", {
		localized: false,
		validation: {
			required: true,
		},
	})
	.addCode("code", {
		languages: ["javascript", "typescript", "css", "html"],
		localized: false,
		validation: {
			required: true,
		},
	});

export default AllFieldsBrick;
