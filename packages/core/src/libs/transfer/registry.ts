import type { ResolvedLucidConfig } from "../../types/config.js";
import type { TransferDefinition } from "./types.js";

const registries = new WeakMap<
	ResolvedLucidConfig,
	ReadonlyMap<string, TransferDefinition>
>();

/** Checks whether a config value was created with `defineTransfer`. */
export const isTransferDefinition = (
	value: unknown,
): value is TransferDefinition =>
	typeof value === "object" &&
	value !== null &&
	"type" in value &&
	value.type === "transfer-definition";

/** Returns the registered core, project and plugin transfer definitions, keyed by their section key in export files. */
export const getTransferRegistry = (
	config: ResolvedLucidConfig,
): ReadonlyMap<string, TransferDefinition> => {
	const existing = registries.get(config);
	if (existing) return existing;

	const registry = new Map(
		config.transfers.map((definition) => [definition.key, definition]),
	);
	registries.set(config, registry);
	return registry;
};
