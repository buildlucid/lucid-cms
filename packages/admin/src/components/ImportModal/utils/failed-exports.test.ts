import type { TransferEntry, TransferFile } from "@types";
import { describe, expect, it } from "vitest";
import type { TransferUpload } from "@/utils/transfer-archive";
import type { ImportItem } from "../types";
import { buildFailedExports } from "./failed-exports";
import { transferKey } from "./import-entries";

const file: TransferFile = {
	lucid: { format: 1, version: "1.0.0" },
	source: { instanceId: "site", url: "https://example.com" },
	exportedAt: "2026-11-02T00:00:00.000Z",
	locales: ["en"],
	resources: {},
};

const item = (
	upload: TransferUpload,
	resource: string,
	entry: TransferEntry,
	valid = true,
): ImportItem => ({
	id: `${resource}:${entry.uid}`,
	upload,
	resource,
	entry,
	valid,
	planned: {
		resource,
		uid: entry.uid,
		label: entry.uid,
		status: "created",
		id: null,
		warnings: [],
		error: null,
		retry: false,
	},
	state: "done",
	progress: 100,
});

describe("buildFailedExports", () => {
	it("keeps failed entries, entries linking to them and what they link to", () => {
		const upload: TransferUpload = {
			name: "pages.zip",
			file,
			files: new Map(),
		};
		const other: TransferUpload = {
			name: "other.json",
			file,
			files: new Map(),
		};
		const items = [
			item(upload, "documents", {
				uid: "home",
				refs: { documents: { "pages:2": "about" } },
			}),
			item(upload, "documents", {
				uid: "about",
				refs: { media: { "4": "logo" } },
			}),
			item(upload, "media", { uid: "logo" }),
			item(upload, "documents", { uid: "contact" }),
			item(other, "documents", { uid: "news" }),
		];

		const exports = buildFailedExports(
			[upload, other],
			items,
			new Set([transferKey("documents", "about")]),
		);

		expect(exports).toHaveLength(1);
		expect(exports[0]?.name).toBe("pages-failed");
		expect(exports[0]?.file.resources).toEqual({
			documents: [
				{ uid: "home", refs: { documents: { "pages:2": "about" } } },
				{ uid: "about", refs: { media: { "4": "logo" } } },
			],
			media: [{ uid: "logo" }],
		});
	});
});
