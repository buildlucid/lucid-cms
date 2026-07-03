import { describe, expect, test } from "vitest";
import BrickBuilder from "../../../libs/collection/builders/brick-builder/index.js";
import CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import type { FieldConditionConfig } from "../../../libs/collection/custom-fields/types.js";
import { copy } from "../../../libs/i18n/index.js";
import { recursiveFieldValidate } from "./check-validate-bricks-fields.js";

const validationData = {};
const meta = { localized: false, defaultLocale: "en" };

const showWhen = (
	field: string,
	value: string,
	options?: Pick<FieldConditionConfig, "action" | "translationScope">,
): FieldConditionConfig => ({
	...options,
	groups: [[{ field, operator: "equals", value }]],
});

const selectOptions = [
	"docs",
	"external",
	"text",
	"other",
	"document",
	"simple",
	"advanced",
	"on",
	"off",
].map((value) => ({ label: value, value }));

const buildCollection = (key: string) =>
	new CollectionBuilder(key, {
		mode: "multiple",
		details: {
			name: copy(`admin:tests.collections.${key}.name`, {
				defaultMessage: key,
			}),
			singularName: copy(`admin:tests.collections.${key}.singularName`, {
				defaultMessage: key,
			}),
		},
	});

describe("condition-hidden fields skip validation", () => {
	const collection = buildCollection("nav")
		.addSelect("menuType", { options: selectOptions })
		.addText("externalUrl", {
			localized: false,
			validation: { required: true },
			ui: { condition: showWhen("menuType", "external") },
		});

	test("required hidden fields do not error when missing", () => {
		const errors = recursiveFieldValidate({
			fields: [{ key: "menuType", type: "select", value: "docs" }],
			instance: collection,
			validationData,
			meta,
		});
		expect(errors).toHaveLength(0);
	});

	test("required visible fields still error when missing", () => {
		const errors = recursiveFieldValidate({
			fields: [{ key: "menuType", type: "select", value: "external" }],
			instance: collection,
			validationData,
			meta,
		});
		expect(errors).toHaveLength(1);
		expect(errors[0]?.key).toBe("externalUrl");
	});

	test("hidden fields skip value validation", () => {
		const errors = recursiveFieldValidate({
			fields: [
				{ key: "menuType", type: "select", value: "docs" },
				//* invalid value that would fail text validation when visible
				{ key: "externalUrl", type: "text", value: 123 },
			],
			instance: collection,
			validationData,
			meta,
		});
		expect(errors).toHaveLength(0);

		const visibleErrors = recursiveFieldValidate({
			fields: [
				{ key: "menuType", type: "select", value: "external" },
				{ key: "externalUrl", type: "text", value: 123 },
			],
			instance: collection,
			validationData,
			meta,
		});
		expect(visibleErrors).toHaveLength(1);
		expect(visibleErrors[0]?.key).toBe("externalUrl");
	});

	test("hide action inverts visibility", () => {
		const hideCollection = buildCollection("hide_nav")
			.addSelect("menuType", { options: selectOptions })
			.addText("legacyUrl", {
				localized: false,
				validation: { required: true },
				ui: {
					condition: {
						action: "hide",
						groups: [
							[{ field: "menuType", operator: "equals", value: "docs" }],
						],
					},
				},
			});

		const hidden = recursiveFieldValidate({
			fields: [{ key: "menuType", type: "select", value: "docs" }],
			instance: hideCollection,
			validationData,
			meta,
		});
		expect(hidden).toHaveLength(0);

		const visible = recursiveFieldValidate({
			fields: [{ key: "menuType", type: "select", value: "external" }],
			instance: hideCollection,
			validationData,
			meta,
		});
		expect(visible).toHaveLength(1);
		expect(visible[0]?.key).toBe("legacyUrl");
	});
});

describe("hidden containers skip their subtree", () => {
	const collection = buildCollection("container_nav")
		.addSelect("menuType", { options: selectOptions })
		.addRepeater("items", {
			ui: { condition: showWhen("menuType", "docs") },
		})
		.addText("label", {
			localized: false,
			validation: { required: true },
		})
		.endRepeater();

	test("descendants of hidden repeaters are not validated", () => {
		const errors = recursiveFieldValidate({
			fields: [
				{ key: "menuType", type: "select", value: "external" },
				{
					key: "items",
					type: "repeater",
					groups: [
						{
							ref: "group-1",
							//* missing required label and no errors expected
							fields: [],
						},
					],
				},
			],
			instance: collection,
			validationData,
			meta,
		});
		expect(errors).toHaveLength(0);
	});

	test("descendants of visible repeaters are validated", () => {
		const errors = recursiveFieldValidate({
			fields: [
				{ key: "menuType", type: "select", value: "docs" },
				{
					key: "items",
					type: "repeater",
					groups: [{ ref: "group-1", fields: [] }],
				},
			],
			instance: collection,
			validationData,
			meta,
		});
		expect(errors).toHaveLength(1);
		expect(errors[0]?.key).toBe("items");
		expect(errors[0]?.groupErrors?.[0]?.fields[0]?.key).toBe("label");
	});
});

describe("ancestor fallback and per-group scoping", () => {
	const collection = buildCollection("links")
		.addSelect("menuType", { options: selectOptions })
		.addRepeater("links")
		.addSelect("linkType", { options: selectOptions })
		.addText("linkLabel", {
			localized: false,
			validation: { required: true },
			ui: { condition: showWhen("linkType", "text") },
		})
		.addText("docNote", {
			localized: false,
			validation: { required: true },
			//* resolves against the root scope via ancestor fallback
			ui: { condition: showWhen("menuType", "docs") },
		})
		.endRepeater();

	test("group-local controllers evaluate per group", () => {
		const errors = recursiveFieldValidate({
			fields: [
				{ key: "menuType", type: "select", value: "external" },
				{
					key: "links",
					type: "repeater",
					groups: [
						{
							ref: "group-visible",
							fields: [{ key: "linkType", type: "select", value: "text" }],
						},
						{
							ref: "group-hidden",
							fields: [{ key: "linkType", type: "select", value: "other" }],
						},
					],
				},
			],
			instance: collection,
			validationData,
			meta,
		});

		expect(errors).toHaveLength(1);
		const groupErrors = errors[0]?.groupErrors ?? [];
		expect(groupErrors).toHaveLength(1);
		expect(groupErrors[0]?.ref).toBe("group-visible");
		expect(groupErrors[0]?.fields.map((f) => f.key)).toEqual(["linkLabel"]);
	});

	test("repeater children resolve root controllers via ancestor fallback", () => {
		const errors = recursiveFieldValidate({
			fields: [
				{ key: "menuType", type: "select", value: "docs" },
				{
					key: "links",
					type: "repeater",
					groups: [
						{
							ref: "group-1",
							fields: [{ key: "linkType", type: "select", value: "other" }],
						},
					],
				},
			],
			instance: collection,
			validationData,
			meta,
		});

		expect(errors).toHaveLength(1);
		expect(errors[0]?.groupErrors?.[0]?.fields.map((f) => f.key)).toEqual([
			"docNote",
		]);
	});
});

describe("same-tree scoping", () => {
	test("brick conditions cannot resolve collection field keys", () => {
		//* menuType only exists in the collection tree, so the show condition
		//* stays unresolved and the brick field remains hidden
		const brick = new BrickBuilder("navItem").addText("title", {
			localized: false,
			validation: { required: true },
			ui: { condition: showWhen("menuType", "docs") },
		});

		const errors = recursiveFieldValidate({
			fields: [],
			instance: brick,
			validationData,
			meta,
		});
		expect(errors).toHaveLength(0);
	});

	test("brick conditions resolve within their own tree", () => {
		const brick = new BrickBuilder("navItem")
			.addSelect("linkType", { options: selectOptions })
			.addText("title", {
				localized: false,
				validation: { required: true },
				ui: { condition: showWhen("linkType", "document") },
			});

		const errors = recursiveFieldValidate({
			fields: [{ key: "linkType", type: "select", value: "document" }],
			instance: brick,
			validationData,
			meta,
		});
		expect(errors).toHaveLength(1);
		expect(errors[0]?.key).toBe("title");
	});
});

describe("hidden tabs skip their fields", () => {
	const brick = new BrickBuilder("hero")
		.addSelect("layout", { options: selectOptions })
		.addTab("advancedTab", {
			ui: { condition: showWhen("layout", "advanced") },
		})
		.addText("advancedTitle", {
			localized: false,
			validation: { required: true },
		});

	test("fields under a hidden tab are skipped", () => {
		const errors = recursiveFieldValidate({
			fields: [{ key: "layout", type: "select", value: "simple" }],
			instance: brick,
			validationData,
			meta,
		});
		expect(errors).toHaveLength(0);
	});

	test("fields under a visible tab are validated", () => {
		const errors = recursiveFieldValidate({
			fields: [{ key: "layout", type: "select", value: "advanced" }],
			instance: brick,
			validationData,
			meta,
		});
		expect(errors).toHaveLength(1);
		expect(errors[0]?.key).toBe("advancedTitle");
	});
});

describe("hidden sections and collapsibles skip their subtree", () => {
	test("required fields inside a hidden section are skipped", () => {
		const collection = buildCollection("section_nav")
			.addSelect("menuType", { options: selectOptions })
			.addSection("badge", {
				ui: { condition: showWhen("menuType", "docs") },
			})
			.addText("label", {
				localized: false,
				validation: { required: true },
			})
			.endSection();

		const hidden = recursiveFieldValidate({
			fields: [{ key: "menuType", type: "select", value: "external" }],
			instance: collection,
			validationData,
			meta,
		});
		expect(hidden).toHaveLength(0);

		const visible = recursiveFieldValidate({
			fields: [{ key: "menuType", type: "select", value: "docs" }],
			instance: collection,
			validationData,
			meta,
		});
		expect(visible).toHaveLength(1);
		expect(visible[0]?.key).toBe("label");
	});

	test("fields inside a hidden section skip value validation", () => {
		const collection = buildCollection("section_value_nav")
			.addSelect("menuType", { options: selectOptions })
			.addSection("badge", {
				ui: { condition: showWhen("menuType", "docs") },
			})
			.addText("label", { localized: false })
			.endSection();

		const errors = recursiveFieldValidate({
			fields: [
				{ key: "menuType", type: "select", value: "external" },
				//* invalid value that would fail text validation when visible
				{ key: "label", type: "text", value: 123 },
			],
			instance: collection,
			validationData,
			meta,
		});
		expect(errors).toHaveLength(0);
	});

	test("required fields inside a hidden collapsible are skipped", () => {
		const collection = buildCollection("collapsible_nav")
			.addSelect("menuType", { options: selectOptions })
			.addCollapsible("advanced", {
				ui: { condition: showWhen("menuType", "docs") },
			})
			.addText("anchorLabel", {
				localized: false,
				validation: { required: true },
			})
			.endCollapsible();

		const hidden = recursiveFieldValidate({
			fields: [{ key: "menuType", type: "select", value: "external" }],
			instance: collection,
			validationData,
			meta,
		});
		expect(hidden).toHaveLength(0);

		const visible = recursiveFieldValidate({
			fields: [{ key: "menuType", type: "select", value: "docs" }],
			instance: collection,
			validationData,
			meta,
		});
		expect(visible).toHaveLength(1);
		expect(visible[0]?.key).toBe("anchorLabel");
	});

	test("deeply nested descendants of hidden structural fields are skipped", () => {
		const collection = buildCollection("nested_section_nav")
			.addSelect("menuType", { options: selectOptions })
			.addSection("outer", {
				ui: { condition: showWhen("menuType", "docs") },
			})
			.addCollapsible("inner")
			.addText("innerLabel", {
				localized: false,
				validation: { required: true },
			})
			.endCollapsible()
			.endSection();

		const hidden = recursiveFieldValidate({
			fields: [{ key: "menuType", type: "select", value: "external" }],
			instance: collection,
			validationData,
			meta,
		});
		expect(hidden).toHaveLength(0);

		const visible = recursiveFieldValidate({
			fields: [{ key: "menuType", type: "select", value: "docs" }],
			instance: collection,
			validationData,
			meta,
		});
		expect(visible).toHaveLength(1);
		expect(visible[0]?.key).toBe("innerLabel");
	});

	test("repeaters inside hidden sections are skipped", () => {
		const collection = buildCollection("section_repeater_nav")
			.addSelect("menuType", { options: selectOptions })
			.addSection("badge", {
				ui: { condition: showWhen("menuType", "docs") },
			})
			.addRepeater("items")
			.addText("label", {
				localized: false,
				validation: { required: true },
			})
			.endRepeater()
			.endSection();

		const errors = recursiveFieldValidate({
			fields: [
				{ key: "menuType", type: "select", value: "external" },
				{
					key: "items",
					type: "repeater",
					groups: [{ ref: "group-1", fields: [] }],
				},
			],
			instance: collection,
			validationData,
			meta,
		});
		expect(errors).toHaveLength(0);
	});

	test("hidden sections inside repeater groups skip their children per group", () => {
		const collection = buildCollection("repeater_section_nav")
			.addRepeater("links")
			.addSelect("linkType", { options: selectOptions })
			.addSection("meta", {
				ui: { condition: showWhen("linkType", "text") },
			})
			.addText("caption", {
				localized: false,
				validation: { required: true },
			})
			.endSection()
			.endRepeater();

		const errors = recursiveFieldValidate({
			fields: [
				{
					key: "links",
					type: "repeater",
					groups: [
						{
							ref: "group-visible",
							fields: [{ key: "linkType", type: "select", value: "text" }],
						},
						{
							ref: "group-hidden",
							fields: [{ key: "linkType", type: "select", value: "other" }],
						},
					],
				},
			],
			instance: collection,
			validationData,
			meta,
		});

		expect(errors).toHaveLength(1);
		const groupErrors = errors[0]?.groupErrors ?? [];
		expect(groupErrors).toHaveLength(1);
		expect(groupErrors[0]?.ref).toBe("group-visible");
		expect(groupErrors[0]?.fields.map((f) => f.key)).toEqual(["caption"]);
	});
});

describe("hidden collection tabs skip their fields", () => {
	const collection = buildCollection("tabbed_collection")
		.addSelect("layout", { options: selectOptions })
		.addTab("advancedTab", {
			ui: { condition: showWhen("layout", "advanced") },
		})
		.addText("advancedTitle", {
			localized: false,
			validation: { required: true },
		});

	test("fields under a hidden collection tab are skipped", () => {
		const errors = recursiveFieldValidate({
			fields: [{ key: "layout", type: "select", value: "simple" }],
			instance: collection,
			validationData,
			meta,
		});
		expect(errors).toHaveLength(0);
	});

	test("fields under a visible collection tab are validated", () => {
		const errors = recursiveFieldValidate({
			fields: [{ key: "layout", type: "select", value: "advanced" }],
			instance: collection,
			validationData,
			meta,
		});
		expect(errors).toHaveLength(1);
		expect(errors[0]?.key).toBe("advancedTitle");
	});
});

describe("localized controllers evaluate per locale", () => {
	const collection = new CollectionBuilder("localized_nav", {
		mode: "multiple",
		details: {
			name: copy("admin:tests.collections.localized.nav.name", {
				defaultMessage: "Localized Nav",
			}),
			singularName: copy("admin:tests.collections.localized.nav.singularName", {
				defaultMessage: "Localized Nav",
			}),
		},
		localized: true,
	})
		.addSelect("mode", { localized: true, options: selectOptions })
		.addText("caption", {
			localized: true,
			ui: { condition: showWhen("mode", "on") },
		});

	test("only locales where the field is visible are validated", () => {
		const errors = recursiveFieldValidate({
			fields: [
				{
					key: "mode",
					type: "select",
					translations: { en: "on", fr: "off" },
				},
				{
					key: "caption",
					type: "text",
					//* invalid values in both locales - only the visible locale errors
					translations: { en: 123, fr: 456 },
				},
			],
			instance: collection,
			validationData,
			meta: { localized: true, defaultLocale: "en" },
		});

		expect(errors).toHaveLength(1);
		expect(errors[0]).toMatchObject({
			key: "caption",
			localeCode: "en",
		});
	});

	test("non-localized fields resolve localized controllers through the default locale", () => {
		const collection = new CollectionBuilder("localized_default_nav", {
			mode: "multiple",
			details: {
				name: copy("admin:tests.collections.localized.default.nav.name", {
					defaultMessage: "Localized Default Nav",
				}),
				singularName: copy(
					"admin:tests.collections.localized.default.nav.singularName",
					{
						defaultMessage: "Localized Default Nav",
					},
				),
			},
			localized: true,
		})
			.addSelect("mode", { localized: true, options: selectOptions })
			.addText("ctaLabel", {
				localized: false,
				validation: { required: true },
				ui: { condition: showWhen("mode", "on") },
			});

		const errors = recursiveFieldValidate({
			fields: [
				{
					key: "mode",
					type: "select",
					translations: { en: "off", fr: "on" },
				},
			],
			instance: collection,
			validationData,
			meta: { localized: true, defaultLocale: "en" },
		});

		expect(errors).toHaveLength(0);
	});

	test("structural containers resolve localized controllers through the default locale", () => {
		const collection = new CollectionBuilder("localized_container_nav", {
			mode: "multiple",
			details: {
				name: copy("admin:tests.collections.localized.container.nav.name", {
					defaultMessage: "Localized Container Nav",
				}),
				singularName: copy(
					"admin:tests.collections.localized.container.nav.singularName",
					{
						defaultMessage: "Localized Container Nav",
					},
				),
			},
			localized: true,
		})
			.addSelect("mode", { localized: true, options: selectOptions })
			.addRepeater("items", {
				ui: { condition: showWhen("mode", "on") },
			})
			.addText("label", {
				localized: false,
				validation: { required: true },
			})
			.endRepeater();

		const errors = recursiveFieldValidate({
			fields: [
				{
					key: "mode",
					type: "select",
					translations: { en: "off", fr: "on" },
				},
				{
					key: "items",
					type: "repeater",
					groups: [{ ref: "group-1", fields: [] }],
				},
			],
			instance: collection,
			validationData,
			meta: { localized: true, defaultLocale: "en" },
		});

		expect(errors).toHaveLength(0);
	});

	test("any translation scope can make a non-localized field visible", () => {
		const collection = new CollectionBuilder("localized_any_nav", {
			mode: "multiple",
			details: {
				name: copy("admin:tests.collections.localized.any.nav.name", {
					defaultMessage: "Localized Any Nav",
				}),
				singularName: copy(
					"admin:tests.collections.localized.any.nav.singularName",
					{
						defaultMessage: "Localized Any Nav",
					},
				),
			},
			localized: true,
		})
			.addSelect("mode", { localized: true, options: selectOptions })
			.addText("ctaLabel", {
				localized: false,
				validation: { required: true },
				ui: {
					condition: showWhen("mode", "on", {
						translationScope: "any",
					}),
				},
			});

		const errors = recursiveFieldValidate({
			fields: [
				{
					key: "mode",
					type: "select",
					translations: { en: "off", fr: "on" },
				},
			],
			instance: collection,
			validationData,
			meta: { localized: true, defaultLocale: "en" },
		});

		expect(errors).toHaveLength(1);
		expect(errors[0]).toMatchObject({
			key: "ctaLabel",
			localeCode: null,
		});
	});
});
