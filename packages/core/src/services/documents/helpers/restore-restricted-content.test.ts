import { describe, expect, test } from "vitest";
import defineBrick from "../../../libs/collection/define-brick.js";
import defineCollection from "../../../libs/collection/define-collection.js";
import field from "../../../libs/collection/definitions/fields/field.js";
import getContentAccess from "../../../libs/collection/field-access/get-content-access.js";
import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../../schemas/collection-fields.js";
import restoreRestrictedContent from "./restore-restricted-content.js";

const collection = defineCollection({
	key: "pages",
	mode: "multiple",
	details: { labels: { singular: "Page", plural: "Pages" } },
	bricks: {
		builder: [
			defineBrick({ key: "text", fields: [field.text("body")] }),
			defineBrick({
				key: "secret",
				permissions: { read: true },
				fields: [field.text("body")],
			}),
			defineBrick({
				key: "legal",
				permissions: { update: true },
				fields: [field.text("body")],
			}),
		],
		embedded: [defineBrick({ key: "quote", fields: [field.text("body")] })],
	},
	fields: [
		field.text("title"),
		field.text("slug", { permissions: { update: true } }),
		field.text("notes", { permissions: { read: true } }),
		field.richText("intro", { permissions: { update: true } }),
		field.repeater("links", {
			fields: [
				field.text("label"),
				field.text("url", { permissions: { update: true } }),
			],
		}),
	],
});

const access = getContentAccess(collection, {
	superAdmin: false,
	permissions: [],
});

const text = (key: string, value: string): FieldInputSchema => ({
	key,
	type: "text",
	value,
});
const brick = (
	key: string,
	ref: string,
	order: number,
	body: string,
): BrickInputSchema => ({
	key,
	ref,
	order,
	type: "builder",
	fields: [text("body", body)],
});
const bodies = (bricks: BrickInputSchema[]) =>
	bricks.map((item) => [item.ref, item.order, item.fields?.[0]?.value]);

describe("restoreRestrictedContent", () => {
	test("keeps stored values for fields the actor can't change or see", () => {
		const restored = restoreRestrictedContent(
			access,
			{
				fields: [
					text("title", "New title"),
					text("slug", "changed"),
					text("notes", "guessed"),
				],
				bricks: [],
			},
			{
				fields: [
					text("title", "Old title"),
					text("slug", "stored"),
					text("notes", "secret"),
				],
				bricks: [],
			},
		);

		expect(restored.fields).toEqual([
			text("title", "New title"),
			text("slug", "stored"),
			text("notes", "secret"),
		]);
	});

	test("matches repeater groups by ref and leaves restricted fields of new groups to their defaults", () => {
		const restored = restoreRestrictedContent(
			access,
			{
				fields: [
					{
						key: "links",
						type: "repeater",
						groups: [
							{ ref: "a", fields: [text("label", "A2"), text("url", "/x")] },
							{ ref: "new", fields: [text("label", "B"), text("url", "/y")] },
						],
					},
				],
				bricks: [],
			},
			{
				fields: [
					{
						key: "links",
						type: "repeater",
						groups: [
							{ ref: "a", fields: [text("label", "A"), text("url", "/a")] },
						],
					},
				],
				bricks: [],
			},
		);

		expect(restored.fields[0]?.groups).toEqual([
			{ ref: "a", fields: [text("label", "A2"), text("url", "/a")] },
			{ ref: "new", fields: [text("label", "B")] },
		]);
	});

	test("puts hidden builder bricks back at their stored position", () => {
		const restored = restoreRestrictedContent(
			access,
			{
				fields: [],
				bricks: [
					brick("text", "two", 0, "Two"),
					brick("text", "one", 1, "One"),
				],
			},
			{
				fields: [],
				bricks: [
					brick("text", "one", 0, "One"),
					brick("secret", "hidden", 1, "Hidden"),
					brick("text", "two", 2, "Two"),
				],
			},
		);

		expect(bodies(restored.bricks)).toEqual([
			["two", 0, "Two"],
			["hidden", 1, "Hidden"],
			["one", 2, "One"],
		]);
	});

	test("lets locked bricks move but not change, appear or disappear", () => {
		const restored = restoreRestrictedContent(
			access,
			{
				fields: [],
				bricks: [
					brick("legal", "kept", 0, "Edited"),
					brick("text", "body", 1, "Body"),
					brick("legal", "added", 2, "Added"),
				],
			},
			{
				fields: [],
				bricks: [
					brick("text", "body", 0, "Body"),
					brick("legal", "kept", 1, "Terms"),
					brick("legal", "removed", 2, "Privacy"),
				],
			},
		);

		expect(bodies(restored.bricks)).toEqual([
			["kept", 0, "Terms"],
			["body", 1, "Body"],
			["removed", 2, "Privacy"],
		]);
	});

	test("keeps embedded bricks as stored when the field holding them is locked", () => {
		const intro: FieldInputSchema = {
			key: "intro",
			type: "rich-text",
			value: {
				type: "doc",
				content: [{ type: "lucidEmbeddedBrick", attrs: { ref: "q" } }],
			},
		};
		const quote = (body: string): BrickInputSchema => ({
			key: "quote",
			ref: "q",
			order: 0,
			type: "embedded",
			fields: [text("body", body)],
		});

		const restored = restoreRestrictedContent(
			access,
			{ fields: [intro], bricks: [quote("Edited")] },
			{ fields: [intro], bricks: [quote("Stored")] },
		);

		expect(restored.bricks).toEqual([quote("Stored")]);
	});
});
