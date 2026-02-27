import { describe, expect, it } from "vitest";
import getMediaType from "./get-media-type.js";

describe("getMediaType", () => {
	it("classifies top-level media categories via MIME prefixes", () => {
		expect(getMediaType("image/png")).toBe("image");
		expect(getMediaType("video/mp4")).toBe("video");
		expect(getMediaType("audio/mpeg")).toBe("audio");
	});

	it("classifies text and document MIME types as document", () => {
		expect(getMediaType("text/plain")).toBe("document");
		expect(getMediaType("application/pdf")).toBe("document");
	});

	it("returns unknown for unclassified MIME types", () => {
		expect(getMediaType("application/octet-stream")).toBe("unknown");
		expect(getMediaType(null)).toBe("unknown");
	});
});
