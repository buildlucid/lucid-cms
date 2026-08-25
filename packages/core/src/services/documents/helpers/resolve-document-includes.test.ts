import { describe, expect, it } from "vitest";
import resolveDocumentIncludes from "./resolve-document-includes.js";

describe("resolveDocumentIncludes", () => {
	it("keeps selected response resources as registry keys", () => {
		const include = resolveDocumentIncludes([
			"refs.documents",
			"refs.media",
			"refs.users",
		]);

		expect(include).toEqual({
			bricks: false,
			refs: ["documents", "media", "users"],
			meta: false,
		});
	});

	it("fetches every ref resource for the unqualified include", () => {
		expect(resolveDocumentIncludes(["refs"]).refs).toBe("all");
	});

	it("uses null when refs were not requested", () => {
		expect(resolveDocumentIncludes().refs).toBeNull();
	});
});
