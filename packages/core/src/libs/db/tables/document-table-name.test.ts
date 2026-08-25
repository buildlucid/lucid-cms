import { describe, expect, it } from "vitest";
import { isDocumentTableName } from "./document-table-name.js";

describe("isDocumentTableName", () => {
	it("recognises collection document tables from the shared prefix", () => {
		expect(isDocumentTableName("lucid_document__pages")).toBe(true);
		expect(isDocumentTableName("lucid_document__pages__ver")).toBe(true);
	});

	it("rejects non-collection document tables", () => {
		expect(isDocumentTableName("lucid_document_workflows")).toBe(false);
		expect(isDocumentTableName("lucid_media")).toBe(false);
	});
});
