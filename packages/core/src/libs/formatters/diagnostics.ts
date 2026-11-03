import type { ResolvedLucidConfig } from "../../types/config.js";
import type {
	DiagnosticCheckKey,
	DiagnosticCheckResult,
	DiagnosticCheckStep,
	DiagnosticPackageUpdate,
	Diagnostics,
} from "../../types/response.js";
import { aiFeatureFlags } from "../config/ai-features.js";
import type { DatabaseMigrationStatus } from "../db/types.js";
import getUpdateStatus from "../package-updates/get-update-status.js";
import type { LatestPackage, PackageInfo } from "../package-updates/types.js";
import formatter from "./helpers.js";

interface DiagnosticsPropsT {
	version: string;
	generatedAt: Date;
	siteUrl: string | null;
	runtime: string | null;
	runtimeVersion: string | null;
	packages: PackageInfo[];
	migrations: DatabaseMigrationStatus;
	documentCounts: Array<{ collection_key: string; count: number | string }>;
	connectionStatus: Diagnostics["ai"]["connection"] | null;
	captchaKey: string | null;
	queueKey: string;
	scheduleCount: number;
	pendingJobs: number | string | undefined;
	failedJobs: number | string | undefined;
}

const formatSingle = (props: {
	diagnostics: DiagnosticsPropsT;
	config: ResolvedLucidConfig;
}): Diagnostics => {
	const { auth, ai, localization } = props.config;
	const documentCounts = new Map(
		props.diagnostics.documentCounts.map((row) => [
			row.collection_key,
			formatter.parseCount(row.count),
		]),
	);

	return {
		generatedAt: props.diagnostics.generatedAt.toISOString(),
		install: {
			version: props.diagnostics.version,
			role: props.config.role,
			url: props.config.url,
			siteUrl: props.diagnostics.siteUrl,
			telemetry: props.config.telemetry,
			announcements: props.config.announcements,
			updateChecks: props.config.updateChecks,
		},
		server: {
			time: props.diagnostics.generatedAt.toISOString(),
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			runtime: props.diagnostics.runtime,
			runtimeVersion: props.diagnostics.runtimeVersion,
		},
		database: {
			adapter: props.config.db.adapter,
			tables: props.config.tables.length,
			migrations: {
				executed: props.diagnostics.migrations.executed.length,
				pending:
					props.diagnostics.migrations.pendingCore.length +
					props.diagnostics.migrations.pendingExternal.length,
				latest: props.diagnostics.migrations.executed.at(-1) ?? null,
			},
		},
		content: {
			collections: props.config.collections.map((collection) => ({
				key: collection.getData.key,
				mode: collection.getData.mode,
				localized: collection.getData.localized,
				revisions: collection.getData.revisions.enabled,
				documents: documentCounts.get(collection.getData.key) ?? 0,
			})),
			bricks: new Set(
				props.config.collections.flatMap((collection) =>
					collection.brickInstances.map((brick) => brick.key),
				),
			).size,
			locales: localization.locales.map((locale) => ({
				code: locale.code,
				default: locale.code === localization.defaultLocale,
			})),
		},
		packages: props.diagnostics.packages.map((item) => ({
			name: item.name,
			version: item.version,
		})),
		plugins: props.config.plugins.map((plugin) => ({
			key: plugin.key,
			lucid: plugin.lucid,
		})),
		auth: {
			password: auth.password.enabled,
			magicLink: auth.magicLink.enabled,
			passkeys: auth.passkeys.enabled,
			twoFactor: {
				enabled: auth.twoFactor.enabled,
				required:
					auth.twoFactor.required === "super-admins"
						? "super-admins"
						: auth.twoFactor.required
							? "everyone"
							: "off",
			},
			providers: auth.providers
				.filter((provider) => provider.enabled)
				.map((provider) => provider.key),
			captcha: props.diagnostics.captchaKey,
		},
		ai: {
			enabled: ai.enabled,
			connection: props.diagnostics.connectionStatus ?? "disconnected",
			features: aiFeatureFlags(ai),
			memory: {
				personal: ai.memory.personal.enabled,
				shared: ai.memory.shared.enabled,
			},
		},
		jobs: {
			queue: props.diagnostics.queueKey,
			schedules: props.diagnostics.scheduleCount,
			pending: formatter.parseCount(props.diagnostics.pendingJobs),
			failedRecently: formatter.parseCount(props.diagnostics.failedJobs),
		},
	};
};

/** Derives check status: skipped if not run, failed if any step errored, otherwise passed. */
const formatCheckResult = (props: {
	key: DiagnosticCheckKey;
	adapter: string | null;
	steps: DiagnosticCheckStep[];
	/** How long the check took, in milliseconds. */
	duration: number;
	/** Why the check didn't run. */
	skipped?: string;
	/** Extra detail for a passed check, or why a check failed without reaching a step. */
	message?: string;
}): DiagnosticCheckResult => {
	const failedStep = props.steps.find((step) => step.error !== null);
	const status = props.skipped
		? "skipped"
		: failedStep || props.steps.length === 0
			? "failed"
			: "passed";

	return {
		key: props.key,
		adapter: props.adapter,
		status,
		duration: props.duration,
		steps: props.steps,
		message: props.skipped ?? failedStep?.error ?? props.message ?? null,
	};
};

/** Compares an installed package with its latest version on npm, naming the core range only when it holds the update back. */
const formatPackageUpdate = (props: {
	package: PackageInfo;
	latest: LatestPackage | null;
}): DiagnosticPackageUpdate => {
	const status = getUpdateStatus({
		installed: props.package.version,
		latest: props.latest,
	});

	return {
		name: props.package.name,
		latest: props.latest?.version ?? null,
		status,
		requiresCore:
			status === "needs-core" ? (props.latest?.requiresCore ?? null) : null,
	};
};

export default {
	formatSingle,
	formatCheckResult,
	formatPackageUpdate,
};
