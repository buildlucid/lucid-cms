import type { Diagnostics } from "@types";
import { describe, expect, it } from "vitest";
import {
	buildDiagnosticsReport,
	type DiagnosticsReportData,
	describeClockSkew,
} from "./diagnostics-report";

const diagnostics: Diagnostics = {
	generatedAt: "2026-11-02T12:00:00.000Z",
	install: {
		version: "0.20.0",
		role: "primary",
		url: "https://cms.example.com",
		siteUrl: null,
		telemetry: false,
		announcements: true,
		updateChecks: true,
	},
	server: {
		time: "2026-11-02T12:00:00.000Z",
		timezone: "UTC",
		runtime: "node",
		runtimeVersion: "v22.11.0",
	},
	database: {
		adapter: "sqlite",
		tables: 0,
		migrations: { executed: 14, pending: 0, latest: "00000014-agent" },
	},
	content: {
		collections: [
			{
				key: "pages",
				mode: "multiple",
				localized: true,
				revisions: false,
				documents: 3,
			},
		],
		bricks: 2,
		locales: [{ code: "en", default: true }],
	},
	packages: [
		{ name: "@lucidcms/core", version: "0.20.0" },
		{ name: "@lucidcms/sqlite", version: "1.2.2" },
	],
	plugins: [],
	auth: {
		password: true,
		magicLink: false,
		passkeys: true,
		twoFactor: { enabled: false, required: "off" },
		providers: [],
		captcha: null,
	},
	ai: {
		enabled: false,
		connection: "disconnected",
		features: {
			imageGeneration: false,
			audioGeneration: false,
			altGeneration: false,
			translation: false,
			chatTitles: false,
			agents: false,
			mcp: false,
		},
		memory: { personal: false, shared: false },
	},
	jobs: { queue: "worker", schedules: 1, pending: 0, failedRecently: 0 },
};

const data: DiagnosticsReportData = {
	diagnostics,
	settings: {},
	client: {
		userAgent: "test",
		language: "en-GB",
		timezone: "Europe/London",
		window: "1440 × 900",
		extensions: { routes: [], slots: 0 },
	},
	clockSkew: 0,
	checks: [],
};

describe("describeClockSkew", () => {
	it("treats a few seconds as in sync and describes larger gaps", () => {
		expect(describeClockSkew(3)).toBe("In sync");
		expect(describeClockSkew(125)).toBe("Server 2m 5s ahead");
		expect(describeClockSkew(-40)).toBe("Server 40s behind");
	});
});

describe("buildDiagnosticsReport", () => {
	it("lists collections and leaves out checks until some have run", () => {
		const report = buildDiagnosticsReport(data);
		expect(report).toContain("  - pages: multiple, localized, 3 documents");
		expect(report).not.toContain("## Checks");
	});

	it("lists installed packages with their versions", () => {
		expect(buildDiagnosticsReport(data)).toContain(
			"## Packages\n- @lucidcms/core 0.20.0\n- @lucidcms/sqlite 1.2.2",
		);
	});

	it("includes failed check steps", () => {
		const report = buildDiagnosticsReport({
			...data,
			checks: [
				{
					key: "kv",
					adapter: "redis",
					status: "failed",
					duration: 12,
					steps: [{ name: "read", error: "Value mismatch" }],
					message: null,
				},
			],
		});
		expect(report).toContain(
			"- KV: failed (redis, 12 ms, read: Value mismatch)",
		);
	});
});
