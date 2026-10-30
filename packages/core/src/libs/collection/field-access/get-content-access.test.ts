import { describe, expect, test } from "vitest";
import BrickBuilder from "../builders/brick-builder/index.js";
import CollectionBuilder from "../builders/collection-builder/index.js";
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
	new CollectionBuilder("pages", {
		mode: "multiple",
		details: { labels: { singular: "Page", plural: "Pages" } },
		bricks: {
			builder: [
				new BrickBuilder("banner", { permissions: { update: true } })
					.addRepeater("slides")
					.addText("caption")
					.endRepeater(),
			],
		},
	})
		.addText("title")
		.addTab("seo", { permissions: { read: true } })
		.addText("metaTitle")
		.addTab("content")
		.addSection("details", { permissions: { update: true } })
		.addText("summary")
		.addText("note", { permissions: { read: true } })
		.endSection();

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
