import type { TransferDefinition } from "../../transfer/types.js";

/** Validates transfer definitions once, when Lucid processes config. */
const checkTransferDefinitions = (transfers: readonly TransferDefinition[]) => {
	const registeredKeys = new Set<string>();

	for (const definition of transfers) {
		if (!definition.key) {
			throw new Error("Transfer definitions need a key.");
		}
		if (registeredKeys.has(definition.key)) {
			throw new Error(
				`Transfer key "${definition.key}" is already registered by Lucid or another definition.`,
			);
		}
		if (definition.import && !definition.entry) {
			throw new Error(
				`Transfer "${definition.key}" imports entries, so it needs an entry schema.`,
			);
		}
		if (definition.export && !definition.selection) {
			throw new Error(
				`Transfer "${definition.key}" exports entries, so it needs a selection schema.`,
			);
		}

		registeredKeys.add(definition.key);
	}
};

export default checkTransferDefinitions;
