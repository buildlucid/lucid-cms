import { expect, test } from "vitest";
import withResponseCleanup from "./with-response-cleanup.js";

test("cleans up once the body has been read, and hands the cleanup to waitUntil", async () => {
	const registered: Array<Promise<unknown>> = [];
	let cleaned = 0;

	const response = await withResponseCleanup(
		new Response("body"),
		async () => {
			cleaned++;
		},
		(promise) => registered.push(promise),
	);
	expect(cleaned).toBe(0);

	expect(await response.text()).toBe("body");
	await Promise.all(registered);

	expect(cleaned).toBe(1);
	expect(registered).toHaveLength(1);
});

test("cleans up straight away when the response has no body", async () => {
	let cleaned = 0;

	await withResponseCleanup(new Response(null, { status: 204 }), () => {
		cleaned++;
	});

	expect(cleaned).toBe(1);
});
