import Repository from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const upsertSingle: ServiceFn<[undefined], undefined> = async (
	context,
	data,
) => {
	// ----------------------------------------------
	// Checks

	// Check collection exists

	// Check collection is locked

	// Check if document exists within the collection

	// Check if a single document already exists for this collection

	// ----------------------------------------------
	// Upsert document

	// ----------------------------------------------
	// Create and manage document versions

	return {
		error: undefined,
		data: undefined,
	};
};

export default upsertSingle;
