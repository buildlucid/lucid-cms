import { describe, expect, it } from "vitest";
import { screenLabel } from "./agent-screen";

describe("screenLabel", () => {
	it("shortens long document labels to what the server takes, rather than stop the message", () => {
		const label = screenLabel("a".repeat(250));
		expect(label).toHaveLength(200);
		expect(label.endsWith("…")).toBe(true);
		expect(screenLabel("  Homepage  ")).toBe("Homepage");
	});
});
