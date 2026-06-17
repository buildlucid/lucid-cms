import type {
	EnvironmentVariables,
	RuntimeAdapter,
} from "@lucidcms/core/types";
import type { GetPlatformProxyOptions, PlatformProxy } from "wrangler";

export type CloudflareWorkerImport = {
	path: string;
	default?: string;
	exports?: Array<
		| string
		| {
				name: string;
				as?: string;
		  }
	>;
};

export type CloudflareWorkerExport = {
	name: string;
	content: string;
	async?: boolean;
	params?: string[];
};

export type CloudflareWorkerExportArtifact = {
	imports: CloudflareWorkerImport[];
	exports: CloudflareWorkerExport[];
};

export type AdapterOptions = {
	platformProxy?: GetPlatformProxyOptions;
	server?: {
		port?: number;
		hostname?: string;
	};
};

export type CloudflareAdapterOptionsFactory = (
	env: EnvironmentVariables,
) => AdapterOptions | Promise<AdapterOptions>;

export type CloudflareAdapterOptionsValue =
	| AdapterOptions
	| CloudflareAdapterOptionsFactory;

export type CloudflareRuntimeAdapter = RuntimeAdapter & {
	getOptions: () => AdapterOptions | undefined;
	resolveOptions: (env: EnvironmentVariables) => Promise<void>;
	getPlatformProxy: () => PlatformProxy | undefined;
	setPlatformProxy: (platformProxy: PlatformProxy | undefined) => void;
};

export type CloudflareAdapterOptions = AdapterOptions;
export type AdapterOptionsType = CloudflareAdapterOptions;
