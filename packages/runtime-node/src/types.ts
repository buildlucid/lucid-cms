import type {
	EnvironmentVariables,
	RuntimeAdapter,
} from "@lucidcms/core/types";

/** Node server settings accepted by node(). */
export type NodeAdapterOptions = {
	/** HTTP listener settings. */
	server?: {
		/** TCP port on which to listen. */
		port?: number;
		/** Network interface or hostname to bind. */
		hostname?: string;
	};
};

/** Resolve server options from parsed environment variables. */
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
