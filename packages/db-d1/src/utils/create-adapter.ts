import {
	createDatabaseAdapterFactory,
	type DatabaseAdapterFactory,
} from "@lucidcms/core/db";
import type { EnvironmentVariables } from "@lucidcms/core/types";
import { D1Adapter } from "../index.js";
import type {
	D1AdapterBindingOptions,
	D1AdapterOptions,
	D1AdapterOptionsFactory,
} from "../types.js";
import getDefaultD1Config from "./get-default-config.js";

const hasDatabase = (
	config: D1AdapterOptions | D1AdapterBindingOptions,
): config is D1AdapterOptions => "database" in config;

const resolveD1Config = (
	config: D1AdapterOptions | D1AdapterBindingOptions | undefined,
	env: EnvironmentVariables,
): D1AdapterOptions => {
	if (config && hasDatabase(config)) {
		return config;
	}

	return getDefaultD1Config(env, config?.binding);
};

const createD1Adapter = (
	config?: D1AdapterOptions | D1AdapterBindingOptions | D1AdapterOptionsFactory,
): D1Adapter | DatabaseAdapterFactory<D1Adapter> => {
	if (config === undefined) {
		return createDatabaseAdapterFactory({
			adapter: "d1",
			resolve: (env) => new D1Adapter(getDefaultD1Config(env)),
		});
	}

	if (typeof config === "function") {
		return createDatabaseAdapterFactory({
			adapter: "d1",
			resolve: async (env) =>
				new D1Adapter(resolveD1Config(await config(env), env)),
		});
	}

	if (hasDatabase(config)) {
		return new D1Adapter(config);
	}

	return createDatabaseAdapterFactory({
		adapter: "d1",
		resolve: (env) => new D1Adapter(resolveD1Config(config, env)),
	});
};

export default createD1Adapter;
