import { expect, test } from "vitest";
import { createBrickStore } from "./brickStore";

test("comparison content, dirty state and locks are independent of the editable pane", () => {
	const left = createBrickStore();
	const right = createBrickStore("comparison-");
	const brick = {
		key: "hero",
		ref: "hero",
		type: "builder" as const,
		open: true,
		order: 0,
		fields: [{ key: "title", type: "text" as const, value: "Original" }],
	};
	left.set("bricks", [structuredClone(brick)]);
	right.set("bricks", [structuredClone(brick)]);
	left.get.captureInitialSnapshot();
	right.get.captureInitialSnapshot();
	right.set("locked", true);
	left.set("bricks", 0, "fields", 0, "value", "Changed");
	expect(left.getDocumentMutated()).toBe(true);
	expect(right.getDocumentMutated()).toBe(false);
	expect(right.get.bricks[0]?.fields[0]?.value).toBe("Original");
	expect(left.get.locked).toBe(false);
	right.get.reset();
	expect(left.get.bricks[0]?.fields[0]?.value).toBe("Changed");
});
