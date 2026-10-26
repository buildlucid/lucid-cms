import { executeHostedAgentRun } from "@lucidcms/core/runtime";
import type { LucidInvocation } from "@lucidcms/core/types";
import { expect, test, vi } from "vitest";
import createAgentRunObject from "./create-agent-run-object.js";

vi.mock("cloudflare:workers", () => ({
	DurableObject: class {
		constructor(
			protected ctx: unknown,
			protected env: unknown,
		) {}
	},
}));
vi.mock("@lucidcms/core/runtime", () => ({
	executeHostedAgentRun: vi.fn(),
	startAgentRunStream: vi.fn(() => ({ initialCursor: "live:epoch:0" })),
	watchAgentRun: vi.fn(),
}));

test.each([
	{ rejects: true },
	{ rejects: false },
])("an alarm keeps a slice that rejects, and its answer, for Cloudflare to retry (rejects: $rejects)", async ({
	rejects,
}) => {
	const stored = new Map<string, unknown>();
	const ctx = {
		storage: {
			get: async (key: string) => stored.get(key),
			put: async (key: string, value: unknown) => {
				stored.set(key, value);
			},
			delete: async (key: string) => stored.delete(key),
			setAlarm: vi.fn(),
		},
		waitUntil: vi.fn(),
	};
	const invocation = {
		getServiceContext: async () => ({ config: {} }),
		destroy: vi.fn(),
	} as unknown as LucidInvocation;
	const LucidAgentRuns = createAgentRunObject(async () => invocation);
	const object = new LucidAgentRuns(ctx as never, {} as never) as InstanceType<
		typeof LucidAgentRuns
	> & { alarm(): Promise<void> };
	if (rejects) {
		vi.mocked(executeHostedAgentRun).mockRejectedValue(new Error("Retry"));
	} else {
		vi.mocked(executeHostedAgentRun).mockResolvedValue(undefined);
	}
	const answer = {
		interactionId: "interaction",
		response: {},
		action: "submit" as const,
		userId: 1,
	};

	await object.start({ runId: "run", answer });
	const alarm = object.alarm();

	if (rejects) {
		await expect(alarm).rejects.toThrow("Retry");
		expect(stored.get("pending")).toMatchObject({ runId: "run", answer });
	} else {
		await alarm;
		expect(stored.has("pending")).toBe(false);
	}
	expect(invocation.destroy).toHaveBeenCalled();
});
