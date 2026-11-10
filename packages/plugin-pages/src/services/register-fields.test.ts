import { copy, defineCollection, field, LucidError } from "@lucidcms/core";
import type { FieldConfig } from "@lucidcms/core/types";
import { expect, test } from "vitest";
import type { ZodType } from "zod";
import type {
	CollectionConfig,
	CollectionRouteSegment,
	PagesFieldPlacement,
} from "../types/types.js";
import registerFields from "./register-fields.js";

const slugSlashMessage = 'Only use a slash when the slug is exactly "/".';
const slugSpaceMessage = "The slug cannot contain spaces.";
const slugFormatMessage =
	"The slug may only contain letters, numbers, underscores, and hyphens.";

const createConfig = (
	options: {
		key?: string;
		placement?: PagesFieldPlacement;
		segments?: CollectionRouteSegment[];
	} = {},
): CollectionConfig => ({
	key: options.key ?? "pages",
	localized: false,
	segments: options.segments ?? [],
	ui: {
		placement: options.placement ?? { at: "end" },
		widths: {
			slug: 6,
			parentPage: 12,
			segments: 6,
		},
	},
	unique: true,
	trackPaths: false,
});

test("slug validation returns specific English zod messages", () => {
	const collection = defineCollection({
		key: "pages",
		mode: "multiple",
		details: {
			labels: {
				singular: copy("admin:tests.collections.pages.singularName", {
					defaultMessage: "Page",
				}),
				plural: copy("admin:tests.collections.pages.name", {
					defaultMessage: "Pages",
				}),
			},
		},
	});

	registerFields(collection as never, createConfig());

	const slugField = collection.flatFields.find((field) => field.key === "slug");
	const schema = (
		slugField as
			| {
					validation?: {
						zod?: ZodType<unknown>;
					};
			  }
			| undefined
	)?.validation?.zod;
	if (!schema) throw new Error("Expected slug field zod validation");

	const slashResult = schema.safeParse("/example");
	if (slashResult.success) throw new Error("Expected slash validation to fail");
	expect(slashResult.error.issues[0]).toMatchObject({
		code: "custom",
		message: slugSlashMessage,
	});

	const trailingSlashResult = schema.safeParse("example/");
	if (trailingSlashResult.success) {
		throw new Error("Expected trailing slash validation to fail");
	}
	expect(trailingSlashResult.error.issues[0]).toMatchObject({
		code: "custom",
		message: slugSlashMessage,
	});

	const spaceResult = schema.safeParse("not valid");
	if (spaceResult.success) throw new Error("Expected space validation to fail");
	expect(spaceResult.error.issues[0]).toMatchObject({
		code: "custom",
		message: slugSpaceMessage,
	});

	const characterResult = schema.safeParse("not-valid!");
	if (characterResult.success) {
		throw new Error("Expected character validation to fail");
	}
	expect(characterResult.error.issues[0]).toMatchObject({
		code: "custom",
		message: slugFormatMessage,
	});
});

test("registers fields in an existing named tab with configured widths", () => {
	const collection = defineCollection({
		key: "pages",
		mode: "multiple",
		details: {
			labels: {
				singular: "Page",
				plural: "Pages",
			},
		},
		fields: [
			field.tab("content", { fields: [field.text("title")] }),
			field.tab("settings", { fields: [field.text("theme")] }),
		],
	});

	registerFields(
		collection as never,
		createConfig({ placement: { at: "end", tab: "content" } }),
	);
	const contentTab = collection.fieldTree[0] as FieldConfig<"tab">;
	const settingsTab = collection.fieldTree[1] as FieldConfig<"tab">;
	expect(contentTab.fields.map((field) => field.key)).toEqual([
		"title",
		"path",
		"slug",
		"parentPage",
	]);
	expect(settingsTab.fields.map((field) => field.key)).toEqual(["theme"]);
	expect(contentTab.fields.map((field) => field.ui?.width)).toEqual([
		undefined,
		undefined,
		6,
		12,
	]);
});

test("registers fields after a root field", () => {
	const collection = defineCollection({
		key: "pages",
		mode: "multiple",
		details: {
			labels: {
				singular: "Page",
				plural: "Pages",
			},
		},
		fields: [field.text("title"), field.textarea("description")],
	});

	registerFields(
		collection as never,
		createConfig({ placement: { after: "title" } }),
	);

	expect(collection.fieldTree.map((field) => field.key)).toEqual([
		"title",
		"path",
		"slug",
		"parentPage",
		"description",
	]);
});

test("inherits the placement anchor tab", () => {
	const collection = defineCollection({
		key: "pages",
		mode: "multiple",
		details: {
			labels: {
				singular: "Page",
				plural: "Pages",
			},
		},
		fields: [
			field.tab("content", {
				fields: [field.text("title"), field.textarea("description")],
			}),
			field.tab("settings", { fields: [field.text("theme")] }),
		],
	});

	registerFields(
		collection as never,
		createConfig({ placement: { before: "description" } }),
	);
	const contentTab = collection.fieldTree[0] as FieldConfig<"tab">;
	const settingsTab = collection.fieldTree[1] as FieldConfig<"tab">;
	expect(contentTab.fields.map((field) => field.key)).toEqual([
		"title",
		"path",
		"slug",
		"parentPage",
		"description",
	]);
	expect(settingsTab.fields.map((field) => field.key)).toEqual(["theme"]);
});

test("registers fields at the start of the collection root", () => {
	const collection = defineCollection({
		key: "pages",
		mode: "multiple",
		details: {
			labels: {
				singular: "Page",
				plural: "Pages",
			},
		},
		fields: [field.text("title")],
	});

	registerFields(
		collection as never,
		createConfig({ placement: { at: "start" } }),
	);

	expect(collection.fieldTree.map((field) => field.key)).toEqual([
		"path",
		"slug",
		"parentPage",
		"title",
	]);
});

test("rejects a missing placement tab", () => {
	const collection = defineCollection({
		key: "pages",
		mode: "multiple",
		details: {
			labels: {
				singular: "Page",
				plural: "Pages",
			},
		},
		fields: [field.text("title")],
	});

	expect(() =>
		registerFields(
			collection as never,
			createConfig({ placement: { at: "end", tab: "routing" } }),
		),
	).toThrow(LucidError);
	expect(collection.fieldTree.map((field) => field.key)).toEqual(["title"]);
});

test("rejects a nested placement anchor", () => {
	const collection = defineCollection({
		key: "pages",
		mode: "multiple",
		details: {
			labels: {
				singular: "Page",
				plural: "Pages",
			},
		},
		fields: [field.section("content", { fields: [field.text("title")] })],
	});

	expect(() =>
		registerFields(
			collection as never,
			createConfig({ placement: { after: "title" } }),
		),
	).toThrow(LucidError);
	const section = collection.fieldTree[0] as FieldConfig<"section">;
	expect(section.fields.map((field) => field.key)).toEqual(["title"]);
});

test("registers route segment relations with responsive widths", () => {
	const collection = defineCollection({
		key: "docs",
		mode: "multiple",
		details: {
			labels: {
				singular: "Doc",
				plural: "Docs",
			},
		},
	});

	registerFields(
		collection as never,
		createConfig({
			key: "docs",

			segments: [
				{ relation: "product", collection: "products", field: "key" },
				{ relation: "version", collection: "versions", field: "key" },
			],
		}),
	);

	const segmentFields = collection.fieldTree.slice(-2);
	expect(segmentFields.map((field) => field.key)).toEqual([
		"product",
		"version",
	]);
	expect(
		segmentFields.map((field) => (field as FieldConfig<"relation">).ui?.width),
	).toEqual([6, 6]);
	expect(
		segmentFields.map((field) => (field as FieldConfig<"relation">).collection),
	).toEqual([["products"], ["versions"]]);
});
