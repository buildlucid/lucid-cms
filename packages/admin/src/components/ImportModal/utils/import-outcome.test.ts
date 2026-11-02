import type { TransferItemResult } from "@types";
import { describe, expect, it } from "vitest";
import type { ImportItem } from "../types";
import { settleOutcome } from "./import-outcome";

const result = (
	status: TransferItemResult["status"],
	warnings: string[] = [],
): TransferItemResult => ({
	resource: "documents",
	uid: "page",
	label: "Page",
	status,
	id: "pages:1",
	warnings,
	error: status === "failed" ? { message: "Failed" } : null,
	retry: false,
});

const item = (data: Partial<ImportItem> = {}): ImportItem => ({
	id: "0:0",
	upload: {
		name: "export.json",
		file: {
			lucid: { format: 1, version: "1.0.0" },
			source: { instanceId: "site", url: "https://example.com" },
			exportedAt: "2026-11-02T00:00:00.000Z",
			locales: ["en"],
			resources: {},
		},
		files: new Map(),
	},
	resource: "documents",
	entry: { uid: "page" },
	valid: true,
	planned: result("created"),
	state: "done",
	progress: 100,
	...data,
});

describe("settleOutcome", () => {
	it("keeps an entry created earlier as created when a later pass updates its links", () => {
		const first = settleOutcome(item(), result("created"));
		const next = settleOutcome(
			item(first),
			result("updated", ["Left out a link"]),
		);

		expect(next.createdAs).toBe("created");
		expect(next.result?.status).toBe("created");
		expect(next.result?.warnings).toEqual(["Left out a link"]);
	});

	it("keeps an update when a later pass changes nothing", () => {
		const next = settleOutcome(
			item({ result: result("updated") }),
			result("unchanged"),
		);

		expect(next.result?.status).toBe("updated");
	});

	it("reports failures but remembers how the entry was created", () => {
		const next = settleOutcome(
			item({ createdAs: "requested", result: result("requested") }),
			result("failed"),
		);

		expect(next.result?.status).toBe("failed");
		expect(next.createdAs).toBe("requested");
	});
});
