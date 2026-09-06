import { describe, expect, expectTypeOf, test } from "vitest";
import type { LucidPluginDefinition } from "../plugins/types.js";
import createToolkit from "./create-toolkit.js";
import defineToolkit from "./define-toolkit.js";
import type { CoreToolkit, ToolkitContext } from "./types.js";

type TestToolkit = {
	context: ToolkitContext;
	core: CoreToolkit;
	getValue: () => string;
};

class ClassToolkit {
	getValue() {
		return "class service";
	}
}

declare module "./types.js" {
	interface ToolkitServices {
		testService: TestToolkit;
		classService: ClassToolkit;
	}
}

describe("createToolkit", () => {
	test("does not promise services from unconfigured plugins", () => {
		const plugins: LucidPluginDefinition[] = [];
		const context = { config: { plugins } } as ToolkitContext;
		const toolkit = createToolkit(context);

		expectTypeOf(toolkit.testService).toEqualTypeOf<TestToolkit | undefined>();
		expect(toolkit.testService).toBeUndefined();
		expect(toolkit.documents).toBeDefined();
	});

	test("checks an augmented service against its registered type", () => {
		const invalidDefinition = {
			key: "testService" as const,
			create: () => ({ getValue: () => "missing context and core" }),
		};

		// @ts-expect-error the service does not satisfy ToolkitServices.testService
		const definition = defineToolkit(invalidDefinition);

		expect(definition.key).toBe("testService");
	});

	test("adds a configured plugin service to the toolkit", () => {
		const definition = defineToolkit({
			key: "testService",
			create: ({ context, core }) => ({
				context,
				core,
				getValue: () => "registered",
			}),
		});
		const plugin: LucidPluginDefinition = {
			key: "test-plugin",
			lucid: "*",
			toolkit: definition,
			configure: () => undefined,
		};
		const context = {
			config: { plugins: [plugin] },
		} as ToolkitContext;

		const toolkit = createToolkit(context);

		expect(toolkit.testService?.getValue()).toBe("registered");
		expect(toolkit.testService?.context).toBe(context);
		expect(toolkit.testService?.core.documents).toBe(toolkit.documents);
		expect(toolkit.testService?.core).not.toHaveProperty("testService");
	});

	test("supports class instances as services", () => {
		const plugin: LucidPluginDefinition = {
			key: "class-plugin",
			lucid: "*",
			toolkit: defineToolkit({
				key: "classService",
				create: () => new ClassToolkit(),
			}),
			configure: () => undefined,
		};
		const context = { config: { plugins: [plugin] } } as ToolkitContext;

		expect(createToolkit(context).classService?.getValue()).toBe(
			"class service",
		);
	});

	test("rejects a service factory that does not return an object", () => {
		const plugin: LucidPluginDefinition = {
			key: "invalid-plugin",
			lucid: "*",
			toolkit: defineToolkit({
				key: "invalidService",
				// @ts-expect-error JavaScript callers can return a primitive
				create: () => "invalid",
			}),
			configure: () => undefined,
		};
		const context = {
			config: { plugins: [plugin] },
		} as ToolkitContext;

		expect(() => createToolkit(context)).toThrow(
			'Toolkit service "invalidService" from plugin "invalid-plugin" must synchronously return a service object.',
		);
	});

	test("rejects asynchronous factories at definition and runtime", () => {
		const plugin: LucidPluginDefinition = {
			key: "async-plugin",
			lucid: "*",
			toolkit: defineToolkit({
				key: "asyncService",
				// @ts-expect-error factories must return their service synchronously
				create: async () => ({ getValue: () => "async" }),
			}),
			configure: () => undefined,
		};
		const context = { config: { plugins: [plugin] } } as ToolkitContext;

		expect(() => createToolkit(context)).toThrow(
			'Toolkit service "asyncService" from plugin "async-plugin" must synchronously return a service object.',
		);
	});
});
