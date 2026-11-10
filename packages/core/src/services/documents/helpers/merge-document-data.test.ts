import { describe, expect, test } from "vitest";
import defineBrick from "../../../libs/collection/define-brick.js";
import defineCollection from "../../../libs/collection/define-collection.js";
import field from "../../../libs/collection/definitions/fields/field.js";
import getContentAccess from "../../../libs/collection/field-access/get-content-access.js";
import { copy } from "../../../libs/i18n/index.js";
import type { DocumentEditableData } from "../../../libs/toolkit/documents/types.js";
import mergeDocumentData from "./merge-document-data.js";
import patchDocumentData from "./patch-document-data.js";

const collection = defineCollection({
	key: "pages",
	mode: "multiple",
	details: { labels: { singular: "Page", plural: "Pages" } },
	bricks: {
		builder: [
			defineBrick({ key: "text", fields: [field.text("body")] }),
			defineBrick({
				key: "legal",
				permissions: { update: true },
				fields: [field.text("body")],
			}),
		],
	},
	fields: [
		field.text("title"),
		field.text("slug", { permissions: { update: true } }),
		field.text("notes", { permissions: { read: true } }),
		field.repeater("links", {
			permissions: { update: true },
			fields: [field.text("label")],
		}),
	],
});

const context = {
	collection,
	localization: { defaultLocale: "en", locales: [{ code: "en" }] },
	access: getContentAccess(collection, { superAdmin: false, permissions: [] }),
};

/** Authoring values as the writer reads them, without the hidden notes field. */
const current: DocumentEditableData = {
	fields: {
		title: "Title",
		slug: "stored",
		links: [{ ref: "a", fields: { label: "A" } }],
	},
	bricks: {
		fixed: {},
		builder: [
			{ ref: "t", key: "text", fields: { body: "Text" } },
			{ ref: "l", key: "legal", fields: { body: "Terms" } },
		],
		embedded: [],
	},
};

describe("mergeDocumentData with field access", () => {
	test("treats hidden fields as unknown", () => {
		const merged = mergeDocumentData(
			context,
			{ fields: { notes: "guess" } },
			current,
		);

		expect(merged.error?.message).toEqual(
			copy("server:core.documents.authoring.field.unknown.at.path", {
				data: { path: "document.fields", key: "notes" },
			}),
		);
	});

	test("rejects changes to locked fields but accepts them resent unchanged", () => {
		const changed = mergeDocumentData(
			context,
			{ fields: { slug: "changed" } },
			current,
		);
		expect(changed.error?.message).toEqual(
			copy("server:core.documents.authoring.field.locked", {
				data: { path: "document.fields.slug" },
			}),
		);

		const unchanged = mergeDocumentData(
			context,
			{ fields: { title: "New", slug: "stored" } },
			current,
		);
		expect(unchanged.data?.fields).toEqual({ ...current.fields, title: "New" });
	});

	test("lets locked bricks move but not be added or removed", () => {
		const moved = mergeDocumentData(
			context,
			{
				bricks: {
					builder: [
						{ ref: "l", key: "legal", fields: {} },
						{ ref: "t", key: "text", fields: {} },
					],
				},
			},
			current,
		);
		expect(moved.data?.bricks.builder.map((brick) => brick.ref)).toEqual([
			"l",
			"t",
		]);

		const removed = mergeDocumentData(
			context,
			{ bricks: { builder: [{ ref: "t", key: "text", fields: {} }] } },
			current,
		);
		expect(removed.error?.status).toBe(403);

		const added = mergeDocumentData(
			context,
			{
				bricks: {
					builder: [
						...current.bricks.builder,
						{ key: "legal", fields: { body: "New" } },
					],
				},
			},
			current,
		);
		expect(added.error?.status).toBe(403);
	});

	test("rejects patches that change a locked repeater's items", () => {
		const patched = patchDocumentData(context, current, [
			{ op: "remove", path: ["fields", "links", { ref: "a" }] },
		]);

		expect(patched.error?.message).toEqual(
			copy("server:core.documents.authoring.items.locked", {
				data: { path: "document.fields.links" },
			}),
		);
	});
});
