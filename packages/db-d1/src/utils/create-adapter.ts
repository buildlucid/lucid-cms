import {
	createDatabaseAdapterFactory,
	type DatabaseAdapterFactory,
} from "@lucidcms/core/db";
import { D1Adapter } from "../index.js";
import type {
	D1AdapterBindingOptions,
	D1AdapterOptions,
	D1AdapterOptionsFactory,
} from "../types.js";
import { createD1WranglerArtifact } from "./wrangler-artifact.js";

const hasDatabase = (
	config: D1AdapterOptions | D1AdapterBindingOptions,
): config is D1AdapterOptions => "database" in config;

const createD1Adapter = (
	config?: D1AdapterOptions | D1AdapterBindingOptions | D1AdapterOptionsFactory,
): DatabaseAdapterFactory<D1Adapter> => {
	if (config === undefined) {
		return createDatabaseAdapterFactory({
			adapter: "d1",
			resolve: () => new D1Adapter(),
			hooks: {
				runtime: [createD1WranglerArtifact()],
			},
		});
	}

	if (typeof config === "function") {
		return createDatabaseAdapterFactory({
			adapter: "d1",
			resolve: () => new D1Adapter(config),
			hooks: {
				runtime: async (env) => {
					const resolved = await config(env);
					return hasDatabase(resolved)
						? []
						: [createD1WranglerArtifact(resolved)];
				},
			},
		});
	}

	if (hasDatabase(config)) {
		throw new Error(
			"Pass D1 database bindings through an environment factory so Lucid can resolve a fresh binding for each invocation.",
		);
	}

	return createDatabaseAdapterFactory({
		adapter: "d1",
		resolve: () => new D1Adapter(config),
		hooks: {
			runtime: [createD1WranglerArtifact(config)],
		},
	});
};

export default createD1Adapter;
