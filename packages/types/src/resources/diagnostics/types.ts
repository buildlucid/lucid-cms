import type { Settings } from "../settings/types.js";

/** Adapters the diagnostics checks can test. `email` sends a test email to the signed-in user. */
export type DiagnosticCheckKey = "database" | "kv" | "mediaStorage" | "email";

export interface DiagnosticCheckStep {
	/** Such as `query`, `write`, `read`, `delete` or `send`. */
	name: string;
	/** Why the step failed, or null when it passed. */
	error: string | null;
}

export interface DiagnosticCheckResult {
	key: DiagnosticCheckKey;
	/** The adapter checked, such as `sqlite` or `s3`, or null when none is configured. */
	adapter: string | null;
	status: "passed" | "failed" | "skipped";
	/** How long the check took, in milliseconds. */
	duration: number;
	steps: DiagnosticCheckStep[];
	/** Why the check failed or was skipped. Passed checks can add detail, such as the test email's delivery status, or leave it null. */
	message: string | null;
}

/** Install and runtime details for the system diagnostics page and bug reports. Never includes secrets or personal data. */
export interface Diagnostics {
	generatedAt: string;
	install: {
		/** The `@lucidcms/core` version. */
		version: string;
		role: "primary" | "content";
		url: string;
		siteUrl: string | null;
		telemetry: boolean;
	};
	server: {
		/** The server's clock when the response was built, to compare with the browser's. */
		time: string;
		/** Such as `Europe/London`. */
		timezone: string;
		runtime: string | null;
		/** Such as `v22.11.0` on Node, or null when the runtime doesn't say. */
		runtimeVersion: string | null;
	};
	database: {
		adapter: string;
		/** Custom tables from the config. */
		tables: number;
		migrations: {
			executed: number;
			pending: number;
			/** The newest executed migration's name. */
			latest: string | null;
		};
	};
	content: {
		collections: {
			key: string;
			mode: "single" | "multiple";
			localized: boolean;
			revisions: boolean;
			/** Documents that aren't deleted. */
			documents: number;
		}[];
		/** Unique bricks across all collections. */
		bricks: number;
		locales: {
			code: string;
			default: boolean;
		}[];
	};
	plugins: {
		key: string;
		/** The Lucid version range the plugin supports. */
		lucid: string;
	}[];
	auth: {
		password: boolean;
		magicLink: boolean;
		passkeys: boolean;
		twoFactor: {
			enabled: boolean;
			required: "off" | "everyone" | "super-admins";
		};
		/** Provider keys, such as `github`. */
		providers: string[];
		captcha: string | null;
	};
	ai: {
		enabled: boolean;
		connection: "connected" | "revoked" | "disconnected";
		features: NonNullable<Settings["ai"]>["features"];
		memory: NonNullable<Settings["ai"]>["memory"];
	};
	jobs: {
		queue: string;
		/** Registered job schedules. */
		schedules: number;
		/** Jobs waiting or running. */
		pending: number;
		/** Jobs that failed in the last 24 hours. */
		failedRecently: number;
	};
}
