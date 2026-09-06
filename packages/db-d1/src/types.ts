/// <reference types="@cloudflare/workers-types" />

import type {
	DatabaseAdapterCreator,
	DatabaseAdapterFactory,
	DatabaseAdapterOptionsFactory,
} from "@lucidcms/core/types";
import type { D1Adapter } from "./index.js";
import type { D1DialectConfig } from "./lib/kysely-d1.js";

export type D1DatabaseBinding = D1Database | D1DatabaseSession;

export type D1AdapterOptions = D1DialectConfig;

/** D1 binding and generated Wrangler database settings. */
export type D1AdapterBindingOptions = {
	/**
	 * Cloudflare D1 binding name. Defaults to "LUCID_D1".
	 */
	binding?: string;
	/**
	 * Wrangler D1 database name. Defaults to a generated name based on the worker
	 * and binding.
	 */
	databaseName?: string;
	/**
	 * Wrangler D1 database id.
	 */
	databaseId?: string;
	/**
	 * Wrangler D1 preview database id.
	 */
	previewDatabaseId?: string;
	/**
	 * Whether Wrangler should use the remote D1 database in local development.
	 */
	remote?: boolean;
};

/** Resolve a D1 database or binding settings from the current environment. */
export type D1AdapterOptionsFactory = DatabaseAdapterOptionsFactory<
	D1AdapterOptions | D1AdapterBindingOptions
>;

export type AdapterOptionsType = D1AdapterOptions | D1AdapterBindingOptions;

export type D1AdapterCreator = {
	(): DatabaseAdapterFactory<D1Adapter>;
	(config: D1AdapterBindingOptions): DatabaseAdapterFactory<D1Adapter>;
	(config: D1AdapterOptionsFactory): DatabaseAdapterFactory<D1Adapter>;
} & DatabaseAdapterCreator<D1Adapter>;
