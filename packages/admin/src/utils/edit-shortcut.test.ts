import { afterEach, expect, test, vi } from "vitest";
import getEditShortcut from "./edit-shortcut";
import isMac from "./is-mac";

vi.mock("./is-mac", () => ({ default: vi.fn(() => false) }));

const press = (key: string, modifiers: Partial<KeyboardEvent> = {}) =>
	getEditShortcut({
		key,
		metaKey: false,
		ctrlKey: true,
		altKey: false,
		shiftKey: false,
		...modifiers,
	});

afterEach(() => {
	vi.mocked(isMac).mockReturnValue(false);
});

test("Z undoes and Shift+Z redoes, matching the letter whatever its case", () => {
	expect(press("z")).toBe("undo");
	expect(press("Z", { shiftKey: true })).toBe("redo");
	expect(press("z", { ctrlKey: false, metaKey: true })).toBe("undo");
});

test("Ctrl+Y redoes off macOS only", () => {
	expect(press("y")).toBe("redo");
	vi.mocked(isMac).mockReturnValue(true);
	expect(press("y", { ctrlKey: false, metaKey: true })).toBeUndefined();
});

test("other keys, or the letter without Cmd or Ctrl or with Alt, aren't a shortcut", () => {
	expect(press("x")).toBeUndefined();
	expect(press("z", { ctrlKey: false })).toBeUndefined();
	expect(press("z", { altKey: true })).toBeUndefined();
});
