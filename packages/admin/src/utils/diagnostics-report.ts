import type { DiagnosticCheckResult, Diagnostics, Settings } from "@types";
import helpers from "@/utils/helpers";

/** What the browser adds to the server's diagnostics. */
export interface ClientDiagnostics {
	userAgent: string;
	language: string;
	timezone: string;
	/** Such as `1440 × 900`. */
	window: string;
	extensions: {
		/** Admin extension route keys. */
		routes: string[];
		/** Admin extension slots across every slot type. */
		slots: number;
	};
}

export interface DiagnosticsReportData {
	diagnostics: Diagnostics;
	settings: Settings;
	client: ClientDiagnostics;
	/** Seconds the server's clock is ahead of the browser's, negative when behind. */
	clockSkew: number | null;
	checks: DiagnosticCheckResult[];
}

/** Check names in the report and on the page. */
export const diagnosticCheckLabels = {
	database: "Database",
	kv: "KV",
	mediaStorage: "Media storage",
	email: "Email",
} as const satisfies Record<DiagnosticCheckResult["key"], string>;

const yesNo = (value: boolean) => (value ? "Yes" : "No");
const list = (values: string[]) =>
	values.length > 0 ? values.join(", ") : "-";
const section = (title: string, lines: string[]) =>
	[`## ${title}`, ...lines].join("\n");

/** Describes how far apart the server and browser clocks are, such as `In sync` or `Server 2m 5s ahead`. */
export const describeClockSkew = (seconds: number | null) => {
	if (seconds === null) return "-";
	//* a few seconds is request latency, not a wrong clock
	if (Math.abs(seconds) < 5) return "In sync";

	const total = Math.abs(seconds);
	const minutes = Math.floor(total / 60);
	const amount = minutes > 0 ? `${minutes}m ${total % 60}s` : `${total}s`;
	return `Server ${amount} ${seconds > 0 ? "ahead" : "behind"}`;
};

/**
 * Builds an English Markdown report from the displayed diagnostics, excluding secrets and personal
 * data.
 */
export const buildDiagnosticsReport = (data: DiagnosticsReportData) => {
	const { diagnostics, settings, client } = data;
	const storage = settings.media?.storage;
	const enabledFeatures = Object.entries(diagnostics.ai.features)
		.filter(([, enabled]) => enabled)
		.map(([feature]) => feature);

	const sections = [
		`# Lucid CMS diagnostics\n\nGenerated ${diagnostics.generatedAt}`,
		section("Install", [
			`- Version: ${diagnostics.install.version}`,
			`- Role: ${diagnostics.install.role}`,
			`- CMS URL: ${diagnostics.install.url}`,
			`- Site URL: ${diagnostics.install.siteUrl ?? "-"}`,
			`- Telemetry: ${yesNo(diagnostics.install.telemetry)}`,
		]),
		section("Server", [
			`- Runtime: ${[diagnostics.server.runtime, diagnostics.server.runtimeVersion].filter(Boolean).join(" ") || "-"}`,
			`- Time: ${diagnostics.server.time}`,
			`- Timezone: ${diagnostics.server.timezone}`,
			`- Clock: ${describeClockSkew(data.clockSkew)}`,
		]),
		section("Adapters", [
			`- Database: ${diagnostics.database.adapter}`,
			`- KV: ${settings.system?.kv ?? "-"}`,
			`- Queue: ${diagnostics.jobs.queue}`,
			`- Media storage: ${settings.system?.mediaStorage ?? "-"}`,
			`- Media delivery: ${settings.system?.mediaDelivery ?? "-"}`,
			`- Email: ${settings.system?.email ?? "-"}${settings.email?.simulated ? " (simulated)" : ""}`,
			`- Captcha: ${diagnostics.auth.captcha ?? "-"}`,
		]),
		section("Database", [
			`- Migrations: ${diagnostics.database.migrations.executed} executed, ${diagnostics.database.migrations.pending} pending`,
			`- Latest migration: ${diagnostics.database.migrations.latest ?? "-"}`,
			`- Custom tables: ${diagnostics.database.tables}`,
		]),
		section("Content", [
			`- Locales: ${list(diagnostics.content.locales.map((locale) => (locale.default ? `${locale.code} (default)` : locale.code)))}`,
			`- Bricks: ${diagnostics.content.bricks}`,
			`- Collections: ${diagnostics.content.collections.length}`,
			...diagnostics.content.collections.map(
				(collection) =>
					`  - ${collection.key}: ${[
						collection.mode,
						collection.localized ? "localized" : undefined,
						collection.revisions ? "revisions" : undefined,
						`${collection.documents} documents`,
					]
						.filter(Boolean)
						.join(", ")}`,
			),
		]),
		section("Media", [
			`- Storage used: ${helpers.bytesToSize(storage?.used)}${storage?.total ? ` of ${helpers.bytesToSize(storage.total)}` : " (unlimited)"}`,
			`- Processed images: ${settings.media?.processed.total ?? 0} (stored: ${yesNo(settings.media?.processed.stored ?? false)}, limit per file: ${settings.media?.processed.imageLimit ?? 0})`,
		]),
		section("Email", [
			`- Simulated: ${yesNo(settings.email?.simulated ?? false)}`,
			`- Templates: ${settings.email?.templates.length ?? 0}`,
		]),
		section("Sign-in", [
			`- Password: ${yesNo(diagnostics.auth.password)}`,
			`- Magic link: ${yesNo(diagnostics.auth.magicLink)}`,
			`- Passkeys: ${yesNo(diagnostics.auth.passkeys)}`,
			`- Two-factor: ${diagnostics.auth.twoFactor.enabled ? `on, required for ${diagnostics.auth.twoFactor.required}` : "off"}`,
			`- Providers: ${list(diagnostics.auth.providers)}`,
		]),
		section("AI", [
			`- Enabled: ${yesNo(diagnostics.ai.enabled)}`,
			`- Lucid connection: ${diagnostics.ai.connection}`,
			`- Features: ${list(enabledFeatures)}`,
			`- Memory: personal ${yesNo(diagnostics.ai.memory.personal)}, shared ${yesNo(diagnostics.ai.memory.shared)}`,
			`- MCP tools: ${settings.mcp?.enabled ? settings.mcp.tools.length : "off"}`,
			...(settings.agents?.agents ?? []).map(
				(agent) =>
					`- Agent ${agent.key}: ${agent.tools.length} tools, ${agent.routines.length} routines`,
			),
		]),
		section("Jobs", [
			`- Schedules: ${diagnostics.jobs.schedules}`,
			`- Pending: ${diagnostics.jobs.pending}`,
			`- Failed in the last 24 hours: ${diagnostics.jobs.failedRecently}`,
		]),
		section("Plugins", [
			...diagnostics.plugins.map(
				(plugin) => `- ${plugin.key} (supports Lucid ${plugin.lucid})`,
			),
			`- Admin extension routes: ${list(client.extensions.routes)}`,
			`- Admin extension slots: ${client.extensions.slots}`,
		]),
		section("Browser", [
			`- User agent: ${client.userAgent}`,
			`- Language: ${client.language}`,
			`- Timezone: ${client.timezone}`,
			`- Window: ${client.window}`,
		]),
	];

	if (data.checks.length > 0) {
		sections.push(
			section(
				"Checks",
				data.checks.map((check) => {
					const detail = [
						check.adapter,
						`${check.duration} ms`,
						check.message,
						...check.steps
							.filter((step) => step.error !== null)
							.map((step) => `${step.name}: ${step.error}`),
					]
						.filter(Boolean)
						.join(", ");
					return `- ${diagnosticCheckLabels[check.key]}: ${check.status} (${detail})`;
				}),
			),
		);
	}

	return `${sections.join("\n\n")}\n`;
};
