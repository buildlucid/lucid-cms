import { defineCollection, field } from "@lucidcms/core";

const MainMenuCollection = defineCollection({
	key: "main-menu",
	mode: "multiple",
	group: {
		key: "navigation",
		label: "Navigation",
		order: 1,
	},
	details: {
		labels: {
			singular: "Navigation Menu",
			plural: "Navigation Menus",
		},
		description: "Manage website and documentation navigation menus.",
	},
	revisions: true,
	localized: true,
	autoSave: true,
	bricks: {
		fixed: [],
		builder: [],
	},
	fields: [
		field.text("title", {
			details: {
				label: "Title",
			},
			localized: true,
			showInList: true,
			validation: {
				required: true,
			},
		}),
		field.select("location", {
			details: {
				label: "Location",
			},
			options: [
				{
					label: "Header",
					value: "header",
				},
				{
					label: "Footer",
					value: "footer",
				},
				{
					label: "Documentation",
					value: "documentation",
				},
			],
			default: "header",
			showInList: true,
			validation: {
				required: true,
			},
		}),
		field.repeater("items", {
			details: {
				label: "Items",
			},
			fields: [
				field.text("label", {
					details: {
						label: "Label",
					},
					localized: true,
					validation: {
						required: true,
					},
				}),
				field.textarea("description", {
					details: {
						label: "Description",
					},
					localized: true,
				}),
				field.select("linkType", {
					details: {
						label: "Link type",
					},
					options: [
						{
							label: "Document",
							value: "document",
						},
						{
							label: "Link",
							value: "link",
						},
					],
					default: "document",
					validation: {
						required: true,
					},
				}),
				field.relation("document", {
					collection: ["page", "blog"],
					details: {
						label: "Document",
						description: "Link this item to a CMS document.",
					},
					multiple: false,
					ui: {
						condition: {
							all: [
								{ field: "linkType", operator: "equals", value: "document" },
							],
						},
					},
					validation: {
						required: true,
					},
				}),
				field.link("link", {
					details: {
						label: "Link",
						description: "Link this item to a custom URL.",
					},
					localized: true,
					ui: {
						condition: {
							all: [{ field: "linkType", operator: "equals", value: "link" }],
						},
					},
					validation: {
						required: true,
					},
				}),
				field.checkbox("available", {
					details: {
						label: "Available",
					},
					default: true,
				}),
				field.checkbox("showBadge", {
					details: {
						label: "Show badge",
					},
					default: false,
					ui: {
						condition: {
							all: [
								{
									field: "location",
									operator: "equals",
									value: "documentation",
								},
							],
						},
					},
				}),
				field.section("badge", {
					details: {
						label: "Badge",
						description:
							"Optional badge shown beside documentation menu items.",
					},
					output: "inline",
					ui: {
						condition: {
							all: [
								{
									field: "location",
									operator: "equals",
									value: "documentation",
								},
								{ field: "showBadge", operator: "equals", value: true },
							],
						},
					},
					fields: [
						field.text("badgeLabel", {
							details: {
								label: "Badge label",
							},
							localized: true,
							ui: {
								width: 6,
							},
							validation: {
								required: true,
							},
						}),
						field.select("badgeTheme", {
							details: {
								label: "Badge colour",
							},
							options: [
								{
									label: "Primary",
									value: "primary",
								},
								{
									label: "Grey",
									value: "grey",
								},
								{
									label: "Dark grey",
									value: "dark-grey",
								},
								{
									label: "Red",
									value: "red",
								},
							],
							default: "primary",
							localized: true,
							ui: {
								width: 6,
							},
						}),
					],
				}),
				field.repeater("children", {
					details: {
						label: "Children",
					},
					fields: [
						field.text("childLabel", {
							details: {
								label: "Label",
							},
							localized: true,
							validation: {
								required: true,
							},
						}),
						field.textarea("childDescription", {
							details: {
								label: "Description",
							},
							localized: true,
						}),
						field.select("childLinkType", {
							details: {
								label: "Link type",
							},
							options: [
								{
									label: "Document",
									value: "document",
								},
								{
									label: "Link",
									value: "link",
								},
							],
							default: "document",
							validation: {
								required: true,
							},
						}),
						field.relation("childDocument", {
							collection: ["page", "blog"],
							details: {
								label: "Document",
								description: "Link this item to a CMS document.",
							},
							multiple: false,
							ui: {
								condition: {
									all: [
										{
											field: "childLinkType",
											operator: "equals",
											value: "document",
										},
									],
								},
							},
							validation: {
								required: true,
							},
						}),
						field.link("childLink", {
							details: {
								label: "Link",
								description: "Link this item to a custom URL.",
							},
							localized: true,
							ui: {
								condition: {
									all: [
										{
											field: "childLinkType",
											operator: "equals",
											value: "link",
										},
									],
								},
							},
							validation: {
								required: true,
							},
						}),
						field.checkbox("childAvailable", {
							details: {
								label: "Available",
							},
							default: true,
						}),
						field.checkbox("childShowBadge", {
							details: {
								label: "Show badge",
							},
							default: false,
							ui: {
								condition: {
									all: [
										{
											field: "location",
											operator: "equals",
											value: "documentation",
										},
									],
								},
							},
						}),
						field.section("childBadge", {
							details: {
								label: "Badge",
								description:
									"Optional badge shown beside documentation child menu items.",
							},
							output: "inline",
							ui: {
								condition: {
									all: [
										{
											field: "location",
											operator: "equals",
											value: "documentation",
										},
										{
											field: "childShowBadge",
											operator: "equals",
											value: true,
										},
									],
								},
							},
							fields: [
								field.text("childBadgeLabel", {
									details: {
										label: "Badge label",
									},
									localized: true,
									ui: {
										width: 6,
									},
									validation: {
										required: true,
									},
								}),
								field.select("childBadgeTheme", {
									details: {
										label: "Badge colour",
									},
									options: [
										{
											label: "Primary",
											value: "primary",
										},
										{
											label: "Grey",
											value: "grey",
										},
										{
											label: "Dark grey",
											value: "dark-grey",
										},
										{
											label: "Red",
											value: "red",
										},
									],
									default: "primary",
									localized: true,
									ui: {
										width: 6,
									},
								}),
							],
						}),
						field.repeater("grandchildren", {
							details: {
								label: "Grandchildren",
							},
							fields: [
								field.text("grandchildLabel", {
									details: {
										label: "Label",
									},
									localized: true,
									validation: {
										required: true,
									},
								}),
								field.textarea("grandchildDescription", {
									details: {
										label: "Description",
									},
									localized: true,
								}),
								field.select("grandchildLinkType", {
									details: {
										label: "Link type",
									},
									options: [
										{
											label: "Document",
											value: "document",
										},
										{
											label: "Link",
											value: "link",
										},
									],
									default: "document",
									validation: {
										required: true,
									},
								}),
								field.relation("grandchildDocument", {
									collection: ["page", "blog"],
									details: {
										label: "Document",
										description: "Link this item to a CMS document.",
									},
									multiple: false,
									ui: {
										condition: {
											all: [
												{
													field: "grandchildLinkType",
													operator: "equals",
													value: "document",
												},
											],
										},
									},
									validation: {
										required: true,
									},
								}),
								field.link("grandchildLink", {
									details: {
										label: "Link",
										description: "Link this item to a custom URL.",
									},
									localized: true,
									ui: {
										condition: {
											all: [
												{
													field: "grandchildLinkType",
													operator: "equals",
													value: "link",
												},
											],
										},
									},
									validation: {
										required: true,
									},
								}),
								field.checkbox("grandchildAvailable", {
									details: {
										label: "Available",
									},
									default: true,
								}),
								field.checkbox("grandchildShowBadge", {
									details: {
										label: "Show badge",
									},
									default: false,
									ui: {
										condition: {
											all: [
												{
													field: "location",
													operator: "equals",
													value: "documentation",
												},
											],
										},
									},
								}),
								field.section("grandchildBadge", {
									details: {
										label: "Badge",
										description:
											"Optional badge shown beside documentation grandchild menu items.",
									},
									output: "inline",
									ui: {
										condition: {
											all: [
												{
													field: "location",
													operator: "equals",
													value: "documentation",
												},
												{
													field: "grandchildShowBadge",
													operator: "equals",
													value: true,
												},
											],
										},
									},
									fields: [
										field.text("grandchildBadgeLabel", {
											details: {
												label: "Badge label",
											},
											localized: true,
											ui: {
												width: 6,
											},
											validation: {
												required: true,
											},
										}),
										field.select("grandchildBadgeTheme", {
											details: {
												label: "Badge colour",
											},
											options: [
												{
													label: "Primary",
													value: "primary",
												},
												{
													label: "Grey",
													value: "grey",
												},
												{
													label: "Dark grey",
													value: "dark-grey",
												},
												{
													label: "Red",
													value: "red",
												},
											],
											default: "primary",
											localized: true,
											ui: {
												width: 6,
											},
										}),
									],
								}),
							],
						}),
					],
				}),
			],
		}),
	],
});

export default MainMenuCollection;
