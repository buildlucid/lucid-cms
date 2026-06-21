/// <reference types="@cloudflare/workers-types" />

import type {
	DatabaseAdapterCreator,
	DatabaseAdapterFactory,
	DatabaseAdapterOptionsFactory,
} from "@lucidcms/core/db";
import type { D1Adapter } from "./index.js";
import type { D1DialectConfig } from "./lib/kysely-d1.js";

export type D1DatabaseBinding = D1Database | D1DatabaseSession;

export type D1AdapterOptions = D1DialectConfig;

export type D1AdapterBindingOptions = {
	/**
	 * Cloudflare D1 binding name. Defaults to "LUCID_D1".
	 */
	binding?: string;
};

export type D1AdapterOptionsFactory = DatabaseAdapterOptionsFactory<
	D1AdapterOptions | D1AdapterBindingOptions
>;

export type AdapterOptionsType = D1AdapterOptions | D1AdapterBindingOptions;

export type D1AdapterCreator = {
	(): DatabaseAdapterFactory<D1Adapter>;
	(config: D1AdapterOptions): D1Adapter;
	(config: D1AdapterBindingOptions): DatabaseAdapterFactory<D1Adapter>;
	(config: D1AdapterOptionsFactory): DatabaseAdapterFactory<D1Adapter>;
} & DatabaseAdapterCreator<D1Adapter>;
