import { expect, test, vi } from "vitest";
import z from "zod";
import { isJobDefinition } from "./registry.js";

test("recognises jobs from another copy of core, such as one a config loader evaluates", async () => {
	vi.resetModules();
	const { default: defineOtherJob } = await import("./define-job.js");

	const job = defineOtherJob({
		name: "test:other-copy",
		version: 1,
		input: z.null(),
		handler: async () => ({ error: undefined, data: undefined }),
	});

	expect(isJobDefinition(job)).toBe(true);
});
