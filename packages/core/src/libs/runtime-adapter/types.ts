import type z from "zod/v4";
import type RuntimeAdapterSchema from "./schema.js";
import type { Config, LucidConfig } from "../../types/config.js";
import type { DevLogger } from "../cli/logger/dev-logger.js";
import type { BuildLogger } from "../cli/logger/build-logger.js";
import type { LucidHonoContext } from "../../types.js";

export type ServeHandler = (
	config: Config,
	logger: DevLogger,
) => Promise<{
	destroy: () => Promise<void>;
	onComplete?: () => Promise<void> | void;
}>;

export type BuildHandler = (
	config: Config,
	options: {
		configPath: string;
		outputPath: string;
	},
	logger: BuildLogger,
) => Promise<void | {
	onComplete?: () => Promise<void> | void;
}>;

export type AdapterKeys = {
	queue: string;
	kv: string;
	media: string | null;
	email: string;
	database: string;
};

export type RuntimeSupport = {
	unsupported?: {
		databaseAdapter?: Array<{ key: string; message?: string }>;
		queueAdapter?: Array<{ key: string; message?: string }>;
		kvAdapter?: Array<{ key: string; message?: string }>;
		mediaAdapter?: Array<{ key: string; message?: string }>;
		emailAdapter?: Array<{ key: string; message?: string }>;
	};
	notices?: {
		databaseAdapter?: Array<{ key: string; message: string }>;
		queueAdapter?: Array<{ key: string; message: string }>;
		kvAdapter?: Array<{ key: string; message: string }>;
		mediaAdapter?: Array<{ key: string; message: string }>;
		emailAdapter?: Array<{ key: string; message: string }>;
	};
};

export type AdapterRuntimeContext = {
	getConnectionInfo: (c: LucidHonoContext) => NetAddrInfo;
	support?: RuntimeSupport;
};

export type RuntimeAdapter = z.infer<typeof RuntimeAdapterSchema>;

export interface EnvironmentVariables extends Record<string, unknown> {}

export type AdapterDefineConfig = (env: EnvironmentVariables) => LucidConfig;

export type ExtendedAdapterDefineConfig<T extends unknown[] = []> = (
	env: EnvironmentVariables,
	...args: T
) => LucidConfig;

// ------------------------------------------------------------
// Hono

// - https://hono.dev/docs/helpers/conninfo#type-definitions

type AddressType = "IPv6" | "IPv4" | undefined;

type NetAddrInfo = {
	/**
	 * Transport protocol type
	 */
	transport?: "tcp" | "udp";
	/**
	 * Transport port number
	 */
	port?: number;

	address?: string;
	addressType?: AddressType;
} & (
	| {
			/**
			 * Host name such as IP Addr
			 */
			address: string;

			/**
			 * Host name type
			 */
			addressType: AddressType;
	  }
	// biome-ignore lint/complexity/noBannedTypes: <explanation>
	| {}
);
