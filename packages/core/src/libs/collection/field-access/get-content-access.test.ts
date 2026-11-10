import { describe, expect, test } from "vitest";
import defineBrick from "../define-brick.js";
import defineCollection from "../define-collection.js";
import field from "../definitions/fields/field.js";
import getContentAccess from "./get-content-access.js";

const editor = { superAdmin: false, permissions: [] };
const reader = {
	superAdmin: false,
	permissions: [
		"documents:pages:fields:seo:read",
		"documents:pages:fields:note:read",
	],
};

const buildCollection = () =>
	defineCollection({
		key: "pages",
		mode: "multiple",
		details: { labels: { singular: "Page", plural: "Pages" } },
		bricks: {
			builder: [
				defineBrick({
					key: "banner",
					permissions: { update: true },
					fields: [
						field.repeater("slides", { fields: [field.text("caption")] }),
					],
				}),
			],
		},
		fields: [
			field.text("title"),
			field.tab("seo", {
				permissions: { read: true },
				fields: [field.text("metaTitle")],
			}),
			field.tab("content", {
				fields: [
					field.section("details", {
						permissions: { update: true },
						fields: [
							field.text("summary"),
							field.text("note", { permissions: { read: true } }),
						],
					}),
				],
			}),
		],
	});

describe("getContentAccess", () => {
	test("combines each field with its tab, section, repeater and brick", () => {
		const access = getContentAccess(buildCollection(), editor);

		expect(Object.fromEntries(access.fields)).toEqual({
			title: "editable",
			seo: "hidden",
			metaTitle: "hidden",
			content: "editable",
			details: "locked",
			summary: "locked",
			note: "hidden",
		});
		expect(access.bricks.get("banner")).toEqual({
			access: "locked",
			fields: new Map([
				["slides", "locked"],
				["caption", "locked"],
			]),
		});
		expect(access.restricted).toBe(true);
	});

	test("granted permissions lift only the restrictions they meet", () => {
		const access = getContentAccess(buildCollection(), reader);

		expect(access.fields.get("metaTitle")).toBe("editable");
		expect(access.fields.get("note")).toBe("locked");
		expect(access.bricks.get("banner")?.access).toBe("locked");
	});

	test("super admins and trusted callers can change everything", () => {
		for (const actor of [{ superAdmin: true, permissions: [] }, undefined]) {
			expect(getContentAccess(buildCollection(), actor).restricted).toBe(false);
		}
	});
});
