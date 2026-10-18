import { describe, expect, test } from "vitest";
import insertBeforeBodyEnd from "./insert-before-body-end.js";

const streamOf = (...chunks: string[]) =>
	new ReadableStream<Uint8Array>({
		start(controller) {
			for (const chunk of chunks) {
				controller.enqueue(new TextEncoder().encode(chunk));
			}
			controller.close();
		},
	});

describe("insertBeforeBodyEnd", () => {
	test("inserts before a closing body tag split across chunks", async () => {
		const stream = insertBeforeBodyEnd(
			streamOf("<html><body><p>Café</p></bo", "dy></html>", "<template>…"),
			() => "<script></script>",
		);
		await expect(new Response(stream).text()).resolves.toBe(
			"<html><body><p>Café</p><script></script></body></html><template>…",
		);
	});

	test("adds the HTML at the end of a page without a body tag", async () => {
		const stream = insertBeforeBodyEnd(
			streamOf("<p>Hi</p>"),
			() => "<script></script>",
		);
		await expect(new Response(stream).text()).resolves.toBe(
			"<p>Hi</p><script></script>",
		);
	});
});
