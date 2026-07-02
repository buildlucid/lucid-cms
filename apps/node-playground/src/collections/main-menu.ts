import { CollectionBuilder } from "@lucidcms/core";

const MainMenuCollection = new CollectionBuilder("main-menu", {
	mode: "multiple",
	group: {
		key: "navigation",
		name: "Navigation",
		order: 1,
	},
	details: {
		name: "Navigation Menus",
		singularName: "Navigation Menu",
		summary: "Manage website and documentation navigation menus.",
	},
	revisions: true,
	localized: true,
	autoSave: true,
	bricks: {
		fixed: [],
		builder: [],
	},
})
	.addText("title", {
		details: {
			label: "Title",
		},
		localized: true,
		listing: true,
		validation: {
			required: true,
		},
	})
	.addSelect("location", {
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
		listing: true,
		validation: {
			required: true,
		},
	})
	.addRepeater("items", {
		details: {
			label: "Items",
		},
	})
	.addText("label", {
		details: {
			label: "Label",
		},
		localized: true,
		validation: {
			required: true,
		},
	})
	.addTextarea("description", {
		details: {
			label: "Description",
		},
		localized: true,
	})
	.addSelect("linkType", {
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
	})
	.addDocument("document", {
		collection: ["page", "blog"],
		details: {
			label: "Document",
			summary: "Link this item to a CMS document.",
		},
		multiple: false,
		ui: {
			condition: {
				groups: [
					[{ field: "linkType", operator: "equals", value: "document" }],
				],
			},
		},
		validation: {
			required: true,
		},
	})
	.addLink("link", {
		details: {
			label: "Link",
			summary: "Link this item to a custom URL.",
		},
		localized: true,
		ui: {
			condition: {
				groups: [[{ field: "linkType", operator: "equals", value: "link" }]],
			},
		},
		validation: {
			required: true,
		},
	})
	.addCheckbox("available", {
		details: {
			label: "Available",
		},
		default: true,
	})
	.addCheckbox("showBadge", {
		details: {
			label: "Show badge",
		},
		default: false,
		ui: {
			condition: {
				groups: [
					[{ field: "location", operator: "equals", value: "documentation" }],
				],
			},
		},
	})
	.addText("badgeLabel", {
		details: {
			label: "Badge label",
		},
		localized: true,
		ui: {
			condition: {
				groups: [
					[
						{ field: "location", operator: "equals", value: "documentation" },
						{ field: "showBadge", operator: "equals", value: true },
					],
				],
			},
		},
		validation: {
			required: true,
		},
	})
	.addSelect("badgeTheme", {
		details: {
			label: "Badge theme",
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
			condition: {
				groups: [
					[
						{ field: "location", operator: "equals", value: "documentation" },
						{ field: "showBadge", operator: "equals", value: true },
					],
				],
			},
		},
	})
	.addRepeater("children", {
		details: {
			label: "Children",
		},
	})
	.addText("childLabel", {
		details: {
			label: "Label",
		},
		localized: true,
		validation: {
			required: true,
		},
	})
	.addTextarea("childDescription", {
		details: {
			label: "Description",
		},
		localized: true,
	})
	.addSelect("childLinkType", {
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
	})
	.addDocument("childDocument", {
		collection: ["page", "blog"],
		details: {
			label: "Document",
			summary: "Link this item to a CMS document.",
		},
		multiple: false,
		ui: {
			condition: {
				groups: [
					[{ field: "childLinkType", operator: "equals", value: "document" }],
				],
			},
		},
		validation: {
			required: true,
		},
	})
	.addLink("childLink", {
		details: {
			label: "Link",
			summary: "Link this item to a custom URL.",
		},
		localized: true,
		ui: {
			condition: {
				groups: [
					[{ field: "childLinkType", operator: "equals", value: "link" }],
				],
			},
		},
		validation: {
			required: true,
		},
	})
	.addCheckbox("childAvailable", {
		details: {
			label: "Available",
		},
		default: true,
	})
	.addCheckbox("childShowBadge", {
		details: {
			label: "Show badge",
		},
		default: false,
		ui: {
			condition: {
				groups: [
					[{ field: "location", operator: "equals", value: "documentation" }],
				],
			},
		},
	})
	.addText("childBadgeLabel", {
		details: {
			label: "Badge label",
		},
		localized: true,
		ui: {
			condition: {
				groups: [
					[
						{ field: "location", operator: "equals", value: "documentation" },
						{ field: "childShowBadge", operator: "equals", value: true },
					],
				],
			},
		},
		validation: {
			required: true,
		},
	})
	.addSelect("childBadgeTheme", {
		details: {
			label: "Badge theme",
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
			condition: {
				groups: [
					[
						{ field: "location", operator: "equals", value: "documentation" },
						{ field: "childShowBadge", operator: "equals", value: true },
					],
				],
			},
		},
	})
	.addRepeater("grandchildren", {
		details: {
			label: "Grandchildren",
		},
	})
	.addText("grandchildLabel", {
		details: {
			label: "Label",
		},
		localized: true,
		validation: {
			required: true,
		},
	})
	.addTextarea("grandchildDescription", {
		details: {
			label: "Description",
		},
		localized: true,
	})
	.addSelect("grandchildLinkType", {
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
	})
	.addDocument("grandchildDocument", {
		collection: ["page", "blog"],
		details: {
			label: "Document",
			summary: "Link this item to a CMS document.",
		},
		multiple: false,
		ui: {
			condition: {
				groups: [
					[
						{
							field: "grandchildLinkType",
							operator: "equals",
							value: "document",
						},
					],
				],
			},
		},
		validation: {
			required: true,
		},
	})
	.addLink("grandchildLink", {
		details: {
			label: "Link",
			summary: "Link this item to a custom URL.",
		},
		localized: true,
		ui: {
			condition: {
				groups: [
					[
						{
							field: "grandchildLinkType",
							operator: "equals",
							value: "link",
						},
					],
				],
			},
		},
		validation: {
			required: true,
		},
	})
	.addCheckbox("grandchildAvailable", {
		details: {
			label: "Available",
		},
		default: true,
	})
	.addCheckbox("grandchildShowBadge", {
		details: {
			label: "Show badge",
		},
		default: false,
		ui: {
			condition: {
				groups: [
					[{ field: "location", operator: "equals", value: "documentation" }],
				],
			},
		},
	})
	.addText("grandchildBadgeLabel", {
		details: {
			label: "Badge label",
		},
		localized: true,
		ui: {
			condition: {
				groups: [
					[
						{ field: "location", operator: "equals", value: "documentation" },
						{ field: "grandchildShowBadge", operator: "equals", value: true },
					],
				],
			},
		},
		validation: {
			required: true,
		},
	})
	.addSelect("grandchildBadgeTheme", {
		details: {
			label: "Badge theme",
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
			condition: {
				groups: [
					[
						{ field: "location", operator: "equals", value: "documentation" },
						{ field: "grandchildShowBadge", operator: "equals", value: true },
					],
				],
			},
		},
	})
	.endRepeater()
	.endRepeater()
	.endRepeater();

export default MainMenuCollection;
