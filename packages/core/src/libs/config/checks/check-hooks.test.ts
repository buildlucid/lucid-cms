import { describe, expect, test } from "vitest";
import defineHookEvents from "../../hooks/define-hook-events.js";
import defineHook from "../../hooks/define-hook.js";
import type { EffectHookEvent } from "../../hooks/types.js";
import checkHooks from "./check-hooks.js";

declare module "../../hooks/types.js" {
	interface PluginHookEvents {
		checkTest: {
			afterSync: EffectHookEvent<Record<string, never>, { ids: number[] }>;
		};
	}
}

const hookEvents = defineHookEvents({
	key: "checkTest",
	events: { afterSync: "effect" },
});
const hooks = [
	defineHook({
		service: "media",
		event: "afterCreate",
		handler: async () => ({ error: undefined, data: undefined }),
	}),
	defineHook({
		service: "checkTest",
		event: "afterSync",
		handler: async () => ({ error: undefined, data: undefined }),
	}),
];

describe("checkHooks", () => {
	test("accepts core events and events from configured plugins", () => {
		expect(() =>
			checkHooks({
				plugins: [{ key: "test-plugin", lucid: "0.x.x", hookEvents }],
				hooks,
			}),
		).not.toThrow();
	});

	test("rejects events no configured plugin registers", () => {
		expect(() => checkHooks({ plugins: [], hooks })).toThrow(
			/"checkTest.afterSync" isn't registered/,
		);
	});
});
