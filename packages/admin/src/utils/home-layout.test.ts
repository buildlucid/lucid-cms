import { describe, expect, it } from "vitest";
import { resolveHomeLayout } from "./home-layout";

const widget = (key: string, hidden = false) => ({
	key,
	size: "md" as const,
	sizes: ["md", "lg"] as const,
	hidden,
});

describe("resolveHomeLayout", () => {
	it("follows the saved order and puts widgets the user has not placed last", () => {
		const layout = resolveHomeLayout(
			[widget("needs"), widget("publishing"), widget("plugin", true)],
			[
				{ key: "publishing", size: "lg" },
				{ key: "removed" },
				{ key: "needs", size: "sm", hidden: true },
			],
		);

		expect(
			layout.map((item) => [item.widget.key, item.size, item.hidden]),
		).toEqual([
			["publishing", "lg", false],
			["needs", "md", true],
			["plugin", "md", true],
		]);
	});
});
