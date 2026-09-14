import { LucidError } from "@lucidcms/core";
import { Client } from "typesense";
import translations from "../../translations/en.server.json" with {
	type: "json",
};
import { PLUGIN_KEY } from "../constants.js";
import type { PluginOptions, ResolvedOptions } from "../types.js";

/** Validates configuration before Lucid starts accepting writes. */
const pluginOptions = (options: PluginOptions): ResolvedOptions => {
	if (
		options.client
			? options.host !== undefined ||
				options.apiKey !== undefined ||
				options.clientOptions !== undefined
			: !options.host?.trim() || !options.apiKey?.trim()
	) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: translations["plugin.typesense.config.connection"],
		});
	}
	let client: Client;
	if (options.client) {
		client = options.client;
	} else {
		const host = options.host.trim();
		const url = URL.parse(host.includes("://") ? host : `https://${host}`);
		if (
			!url ||
			!["https:", "http:"].includes(url.protocol) ||
			url.username ||
			url.password ||
			url.search ||
			url.hash
		) {
			throw new LucidError({
				scope: PLUGIN_KEY,
				message: translations["plugin.typesense.config.host"],
			});
		}
		client = new Client({
			nodes: [{ url: url.toString().replace(/\/$/, "") }],
			apiKey: options.apiKey,
			connectionTimeoutSeconds: 10,
			numRetries: 1,
			retryIntervalSeconds: 1,
			logLevel: "silent",
			...options.clientOptions,
		});
	}
	const batchSize = options.batchSize ?? 50;
	const maxRecordsPerItem = options.maxRecordsPerItem ?? 100;
	if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 200) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: translations["plugin.typesense.config.batch.size"],
		});
	}
	if (
		!Number.isInteger(maxRecordsPerItem) ||
		maxRecordsPerItem < 1 ||
		maxRecordsPerItem > 100
	) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: translations["plugin.typesense.config.record.limit"],
		});
	}
	const { connectionTimeoutSeconds, numRetries, retryIntervalSeconds } =
		client.configuration;
	if (
		!Number.isFinite(connectionTimeoutSeconds) ||
		connectionTimeoutSeconds < 1 ||
		connectionTimeoutSeconds > 10 ||
		!Number.isInteger(numRetries) ||
		numRetries < 0 ||
		numRetries > 3 ||
		!Number.isFinite(retryIntervalSeconds) ||
		retryIntervalSeconds < 0 ||
		retryIntervalSeconds > 1
	) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: translations["plugin.typesense.config.client.timing"],
		});
	}
	const reconcileIntervalSeconds = options.reconcileIntervalSeconds ?? 3600;
	if (
		!Number.isInteger(reconcileIntervalSeconds) ||
		reconcileIntervalSeconds < 60
	)
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: translations["plugin.typesense.config.reconcile.interval"],
		});
	const keys = new Set<string>();
	const aliases = new Set<string>();
	for (const index of options.indexes) {
		if (!/^[a-zA-Z0-9_-]+$/.test(index.key) || keys.has(index.key)) {
			throw new LucidError({
				scope: PLUGIN_KEY,
				message: translations["plugin.typesense.config.index.key"],
			});
		}
		if (!/^[a-zA-Z0-9_-]+$/.test(index.alias) || aliases.has(index.alias)) {
			throw new LucidError({
				scope: PLUGIN_KEY,
				message: translations["plugin.typesense.config.alias"],
			});
		}
		keys.add(index.key);
		aliases.add(index.alias);
		if (index.sources.length === 0)
			throw new LucidError({
				scope: PLUGIN_KEY,
				message: translations["plugin.typesense.config.sources.empty"],
			});
		if (index.schema.fields.some((field) => field.name.startsWith("_lucid_"))) {
			throw new LucidError({
				scope: PLUGIN_KEY,
				message: translations["plugin.typesense.config.fields.reserved"],
			});
		}
		const sourceKeys = new Set<string>();
		for (const source of index.sources) {
			if (!source.key || sourceKeys.has(source.key))
				throw new LucidError({
					scope: PLUGIN_KEY,
					message: translations["plugin.typesense.config.source.key"],
				});
			sourceKeys.add(source.key);
			if (source.locales?.length === 0)
				throw new LucidError({
					scope: PLUGIN_KEY,
					message: translations["plugin.typesense.config.locales.empty"],
				});
			if (
				source.locales &&
				new Set(source.locales).size !== source.locales.length
			)
				throw new LucidError({
					scope: PLUGIN_KEY,
					message: translations["plugin.typesense.config.locales.duplicate"],
				});
		}
	}
	return {
		client,
		indexes: options.indexes,
		batchSize,
		maxRecordsPerItem,
		reconcileIntervalSeconds,
	};
};

export default pluginOptions;
