import { describe, expect, test, vi } from "vitest";
import coalesceRenders from "./coalesce-renders.js";

const page = { body: "<h1>Home</h1>", contentType: "text/html", tokens: {} };

describe("coalesceRenders", () => {
	test("renders a page once while requests for it overlap, then again afterwards", async () => {
		const finishes: Array<() => void> = [];
		const render = vi.fn(
			() =>
				new Promise<typeof page>((resolve) => {
					finishes.push(() => resolve(page));
				}),
		);

		const first = coalesceRenders("home", render);
		const second = coalesceRenders("home", render);
		const other = coalesceRenders("about", render);
		expect(render).toHaveBeenCalledTimes(2);

		for (const finish of finishes) finish();
		await expect(first).resolves.toBe(page);
		await expect(second).resolves.toBe(page);
		await expect(other).resolves.toBe(page);

		coalesceRenders("home", render);
		expect(render).toHaveBeenCalledTimes(3);
	});

	test("lets every waiting request see a failed render, then tries again", async () => {
		const render = vi
			.fn<() => Promise<typeof page>>()
			.mockRejectedValueOnce(new Error("Boom"))
			.mockResolvedValueOnce(page);

		const first = coalesceRenders("blog", render);
		const second = coalesceRenders("blog", render);
		await expect(first).rejects.toThrow("Boom");
		await expect(second).rejects.toThrow("Boom");

		await expect(coalesceRenders("blog", render)).resolves.toBe(page);
	});
});
