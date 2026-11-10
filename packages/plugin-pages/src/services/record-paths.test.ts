import { defineCollection } from "@lucidcms/core";
import { describe, expect, test } from "vitest";
import type { CollectionConfig } from "../types/types.js";
import recordPaths from "./record-paths.js";

const page = defineCollection({
	key: "page",
	mode: "multiple",
	details: { labels: { singular: "Page", plural: "Pages" } },
	publishing: {
		environments: [{ key: "production", label: "Production" }],
	},
});

const collection = {
	key: "page",
	localized: false,
	segments: [],
	ui: {
		placement: { at: "end" },
		widths: { slug: 12, parentPage: 12, segments: 12 },
	},
	unique: true,
	trackPaths: true,
} satisfies CollectionConfig;

const values = [
	{ documentId: 1, versionId: 2, values: new Map([[null, "/about"]]) },
];

//* any database use fails, so these only pass when nothing is recorded
const context = {
	config: { collections: [page] },
	get db(): never {
		throw new Error("Nothing should be recorded.");
	},
} as never;

describe("recording page paths", () => {
	test("skips latest when the collection has environments", async () => {
		const result = await recordPaths(context, {
			collection,
			scope: { type: "version", versionType: "latest" },
			values,
		});

		expect(result).toEqual({ error: undefined, data: undefined });
	});

	test("skips request proposals", async () => {
		const result = await recordPaths(context, {
			collection,
			scope: {
				type: "request",
				versions: new Map([[1, 2]]),
				fallback: "latest",
			},
			values,
		});

		expect(result).toEqual({ error: undefined, data: undefined });
	});

	test("skips collections that don't track paths", async () => {
		const result = await recordPaths(context, {
			collection: { ...collection, trackPaths: false },
			scope: { type: "version", versionType: "production" },
			values,
		});

		expect(result).toEqual({ error: undefined, data: undefined });
	});
});
