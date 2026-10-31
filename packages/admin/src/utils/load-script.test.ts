import { afterEach, expect, test, vi } from "vitest";
import { loadScript } from "./load-script.js";

afterEach(() => vi.restoreAllMocks());

/** Captures appended scripts instead of letting the DOM fetch them. */
const captureScripts = () => {
	const scripts: HTMLScriptElement[] = [];
	vi.spyOn(document.head, "append").mockImplementation((node) => {
		scripts.push(node as HTMLScriptElement);
	});
	return scripts;
};

test("retries a script whose setup never became ready", async () => {
	const scripts = captureScripts();
	const src = "https://captcha.example/api.js";

	const first = loadScript(src, () => Promise.reject(new Error("no sdk")));
	scripts[0]?.onload?.(new Event("load"));
	await expect(first).rejects.toThrow();

	const second = loadScript(src, () => Promise.resolve());
	expect(scripts).toHaveLength(2);
	scripts[1]?.onload?.(new Event("load"));
	await expect(second).resolves.toBeUndefined();
	expect(loadScript(src)).toBe(loadScript(src));
	expect(scripts).toHaveLength(2);
});
