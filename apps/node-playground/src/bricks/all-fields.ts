import { defineBrick, field } from "@lucidcms/core";

const AllFieldsBrick = defineBrick({
	key: "all-fields",
	details: {
		label: "All custom fields",
		description:
			"Exercises every built-in field and structural field in the builder.",
	},
	permissions: { read: true },
	fields: [
		field.tab("content", {
			details: {
				label: "Content",
			},
			fields: [
				field.text("localized_required_text", {
					details: {
						label: "Localized required text",
					},
					localized: true,
					validation: {
						required: true,
					},
				}),
				field.text("shared_text", {
					details: {
						label: "Shared text",
					},
					localized: false,
				}),
				field.textarea("textarea", {
					localized: true,
				}),
				field.richText("rich_text", {
					localized: true,
				}),
				field.number("number", {
					localized: false,
					validation: {
						required: true,
					},
				}),
				field.range("range", {
					default: [25, 75],
					localized: false,
					min: 0,
					max: 100,
					step: 5,
					thumbs: 2,
				}),
				field.checkbox("checkbox", {
					localized: false,
				}),
				field.select("localized_required_select", {
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
				}),
				field.datetime("datetime", {
					localized: false,
				}),
				field.color("color", {
					localized: false,
					presets: ["#2563eb", "#16a34a", "#dc2626"],
				}),
			],
		}),
		field.tab("structure", {
			details: {
				label: "Structure",
			},
			fields: [
				field.section("section", {
					details: {
						label: "Section",
					},
					fields: [
						field.text("section_text", {
							localized: true,
							validation: {
								required: true,
							},
						}),
					],
				}),
				field.collapsible("collapsible", {
					defaultOpen: false,
					details: {
						label: "Collapsible",
					},
					fields: [
						field.text("collapsible_text", {
							localized: false,
							validation: {
								required: true,
							},
						}),
					],
				}),
				field.repeater("items", {
					validation: {
						minGroups: 1,
						maxGroups: 3,
					},
					fields: [
						field.text("item_title", {
							details: {
								label: "Item title",
							},
							localized: true,
							validation: {
								required: true,
							},
						}),
						field.checkbox("item_enabled", {
							localized: false,
						}),
						field.repeater("nested_items", {
							validation: {
								maxGroups: 2,
							},
							fields: [
								field.text("nested_item_title", {
									details: {
										label: "Nested item title",
									},
									localized: true,
									validation: {
										required: true,
									},
								}),
								field.select("nested_item_select", {
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
								}),
							],
						}),
					],
				}),
			],
		}),
		field.tab("references", {
			details: {
				label: "References",
			},
			fields: [
				field.media("media", {
					localized: false,
					multiple: true,
				}),
				field.relation("related_pages", {
					collection: ["page", "blog", "settings"],
					localized: false,
					multiple: true,
				}),
				field.user("users", {
					localized: false,
					multiple: true,
				}),
				field.link("required_link", {
					localized: false,
					validation: {
						required: true,
					},
				}),
			],
		}),
		field.tab("technical", {
			details: {
				label: "Technical",
			},
			fields: [
				field.json("json", {
					localized: false,
					validation: {
						required: true,
					},
				}),
				field.code("code", {
					languages: ["javascript", "typescript", "css", "html"],
					localized: false,
					validation: {
						required: true,
					},
				}),
			],
		}),
	],
});

export default AllFieldsBrick;
