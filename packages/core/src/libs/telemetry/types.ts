import type { Config } from "../../types/config.js";
import type { FirstPartyRuntimeAdapterKey } from "../runtime/constants.js";
import type {
	AdapterKeys,
	AdapterRuntimeContext,
	EnvironmentVariables,
} from "../runtime/types.js";

export type TelemetryCommand = "dev" | "serve" | "build";
export type TelemetryOutcome = "succeeded" | "failed";
export type TelemetryStage =
	| "migration"
	| "artifacts"
	| "admin_build"
	| "email_templates"
	| "public_assets"
	| "runtime_initialization"
	| "server_listen"
	| "runtime_build"
	| "finalize";

export type TelemetryCountBucket =
	| "0"
	| "1"
	| "2-5"
	| "6-10"
	| "11-25"
	| "26-50"
	| "51-100"
	| "101+";

export type TelemetryEnvelope = {
	schema_version: 1;
	event_id: string;
	installation_id: string;
	occurred_at: string;
	event: {
		name: "lucid.command.completed";
		command: TelemetryCommand;
		outcome: TelemetryOutcome;
		stage: TelemetryStage;
		duration_ms?: number;
	};
	context: {
		lucid_version: string;
		runtime: FirstPartyRuntimeAdapterKey<"runtime"> | "custom";
		compiled: boolean;
		node_major: number;
		platform: "darwin" | "linux" | "win32" | "other";
		architecture: "arm64" | "x64" | "other";
		package_manager: "npm" | "pnpm" | "yarn" | "bun" | "other";
		environment: "development" | "production" | "test" | "other";
		is_ci: boolean;
		adapters: {
			database: FirstPartyRuntimeAdapterKey<"database"> | "custom";
			media?: FirstPartyRuntimeAdapterKey<"media"> | "none" | "custom";
			queue?: FirstPartyRuntimeAdapterKey<"queue"> | "custom";
			kv?: FirstPartyRuntimeAdapterKey<"kv"> | "custom";
			email?: FirstPartyRuntimeAdapterKey<"email"> | "custom";
		};
		features: {
			localization: boolean;
			ai: boolean;
			open_api: boolean;
			password_auth: boolean;
		};
		counts: {
			collections: TelemetryCountBucket;
			bricks: TelemetryCountBucket;
			fields: TelemetryCountBucket;
			plugins: TelemetryCountBucket;
			locales: TelemetryCountBucket;
			auth_providers: TelemetryCountBucket;
		};
	};
};

export type ReportTelemetryOptions = {
	config: Config;
	env?: EnvironmentVariables;
	runtimeContext: AdapterRuntimeContext;
	projectRoot: string;
	adapterKeys?: AdapterKeys;
	command: TelemetryCommand;
	outcome: TelemetryOutcome;
	stage: TelemetryStage;
	durationMs?: number;
};
