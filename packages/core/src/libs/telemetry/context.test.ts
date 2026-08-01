import { describe, expect, test } from "vitest";
import type { Config } from "../../types/config.js";
import type { AdapterRuntimeContext } from "../runtime/types.js";
import { getTelemetryContext, getTelemetryCountBucket } from "./context.js";

const runtimeContext = {
	runtime: "node",
	compiled: false,
	configEntryPoint: null,
	getConnectionInfo: () => ({}),
} satisfies AdapterRuntimeContext;

const config = {
	db: { adapter: "sqlite" },
	localization: {
		locales: [
			{ label: "English", code: "en" },
			{ label: "French", code: "fr" },
		],
	},
	ai: { enabled: true },
	http: { openAPI: { enabled: false } },
	auth: {
		password: { enabled: true },
		providers: [{}, {}],
	},
	plugins: [{}, {}],
	collections: [
		{
			key: "pages",
			flatFields: [{}, {}, {}],
			brickInstances: [{ key: "hero", flatFields: [{}, {}, {}, {}] }],
		},
		{
			key: "articles",
			flatFields: [{}, {}, {}, {}, {}, {}],
			brickInstances: [
				{ key: "hero", flatFields: [{}, {}, {}, {}] },
				{ key: "body", flatFields: [{}, {}, {}, {}, {}, {}, {}, {}] },
			],
		},
	],
} as unknown as Config;

describe("telemetry context", () => {
	test("buckets counts at privacy-preserving boundaries", () => {
		expect([0, 1, 2, 6, 11, 26, 51, 101].map(getTelemetryCountBucket)).toEqual([
			"0",
			"1",
			"2-5",
			"6-10",
			"11-25",
			"26-50",
			"51-100",
			"101+",
		]);
	});

	test("collects only normalized setup categories and coarse counts", () => {
		const context = getTelemetryContext({
			config,
			runtimeContext,
			env: {
				NODE_ENV: "development",
				npm_config_user_agent: "pnpm/10.0.0 node/v24.0.0",
				CI: "0",
				CONTINUOUS_INTEGRATION: "0",
				GITHUB_ACTIONS: "0",
				BUILDKITE: "0",
			},
			adapterKeys: {
				database: "sqlite",
				media: "private-media-adapter",
				queue: "worker",
				kv: "redis",
				email: "resend",
			},
		});

		expect(context.runtime).toBe("node");
		expect(context.package_manager).toBe("pnpm");
		expect(context.environment).toBe("development");
		expect(context.is_ci).toBe(false);
		expect(context.adapters).toEqual({
			database: "sqlite",
			media: "custom",
			queue: "worker",
			kv: "redis",
			email: "resend",
		});
		expect(context.features).toEqual({
			localization: true,
			ai: true,
			open_api: false,
			password_auth: true,
		});
		expect(context.counts).toEqual({
			collections: "2-5",
			bricks: "2-5",
			fields: "11-25",
			plugins: "2-5",
			locales: "2-5",
			auth_providers: "2-5",
		});
	});
});
