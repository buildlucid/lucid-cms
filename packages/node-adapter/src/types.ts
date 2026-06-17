import type {
	EnvironmentVariables,
	RuntimeAdapter,
} from "@lucidcms/core/types";

export type NodeAdapterOptions = {
	server?: {
		port?: number;
		hostname?: string;
	};
};

export type NodeAdapterOptionsFactory = (
	env: EnvironmentVariables,
) => NodeAdapterOptions | Promise<NodeAdapterOptions>;

export type NodeAdapterOptionsValue =
	| NodeAdapterOptions
	| NodeAdapterOptionsFactory;

export type NodeRuntimeAdapter = RuntimeAdapter & {
	getOptions: () => NodeAdapterOptions | undefined;
	resolveOptions: (env: EnvironmentVariables) => Promise<void>;
};

export type AdapterOptionsType = NodeAdapterOptions;
