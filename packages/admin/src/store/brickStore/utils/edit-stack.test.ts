import { describe, expect, test } from "vitest";
import { createEditStack, type EditEntry } from "./edit-stack";

const user = { type: "user" } as const;
const title = { brickRef: "hero", key: "title" };

const typed = (
	after: string,
	at: number,
	before = "",
	target = title,
): EditEntry => ({
	kind: "field",
	target,
	before,
	after,
	source: user,
	at,
});

describe("edit stack", () => {
	test("continued typing into one field merges into a single step", () => {
		const stack = createEditStack();
		stack.push(typed("H", 0));
		stack.push(typed("He", 400, "H"));
		stack.push(typed("Hey", 900, "He"));

		expect(stack.undo()).toMatchObject({ before: "", after: "Hey" });
		expect(stack.undo()).toBeUndefined();
	});

	test("a pause, another field or a structural step starts a new step", () => {
		const stack = createEditStack();
		stack.push(typed("H", 0));
		stack.push(typed("He", 1_500, "H"));
		stack.push(typed("x", 1_600, "", { brickRef: "hero", key: "subtitle" }));
		stack.push(typed("Hey", 1_700, "He"));

		expect(stack.undo()).toMatchObject({ before: "He", after: "Hey" });
		expect(stack.undo()).toMatchObject({ target: { key: "subtitle" } });
		expect(stack.undo()).toMatchObject({ before: "H", after: "He" });
		expect(stack.undo()).toMatchObject({ before: "", after: "H" });
	});

	test("typing that ends where it started leaves no step", () => {
		const stack = createEditStack();
		stack.push(typed("H", 0));
		stack.push(typed("", 300, "H"));

		expect(stack.peekUndo()).toBeUndefined();
	});

	test("a new step after undoing drops the redo steps", () => {
		const stack = createEditStack();
		stack.push(typed("a", 0));
		stack.push(typed("b", 5_000, "a"));
		stack.undo();
		expect(stack.peekRedo()).toMatchObject({ after: "b" });

		stack.push(typed("c", 10_000, "a"));
		expect(stack.peekRedo()).toBeUndefined();
		expect(stack.redo()).toBeUndefined();
	});

	test("typing that merges into the last step still drops the redo steps", () => {
		const stack = createEditStack();
		stack.push(typed("a", 0));
		stack.push(typed("x", 200, "", { brickRef: "hero", key: "subtitle" }));
		stack.undo();

		stack.push(typed("ab", 400, "a"));
		expect(stack.peekUndo()).toMatchObject({ before: "", after: "ab" });
		expect(stack.peekRedo()).toBeUndefined();
	});

	test("the oldest steps go once the limit is reached", () => {
		const stack = createEditStack();
		for (let index = 0; index < 120; index++) {
			stack.push(typed(`${index}`, index * 5_000));
		}

		let undone = 0;
		while (stack.undo()) undone++;
		expect(undone).toBe(100);
	});
});
