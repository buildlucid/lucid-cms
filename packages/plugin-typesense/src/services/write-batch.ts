import { copy } from "@lucidcms/core";
import type { ServiceFn, ServiceResponse } from "@lucidcms/core/types";
import type { Client } from "typesense";
import { IMPORT_BATCH_SIZE } from "../constants.js";
import type { IndexRecord } from "../types.js";
import batches from "../utils/batches.js";
import providerError from "../utils/provider-error.js";

/** Checks every import row before removing records no longer produced by these owners. */
const writeBatch: ServiceFn<
	[
		{
			client: Client;
			collection: string;
			records: IndexRecord[];
			owners: string[];
			revision: string;
			checkLease: () => ServiceResponse<undefined>;
		},
	],
	undefined
> = async (_context, data) => {
	try {
		for (const records of batches(data.records, IMPORT_BATCH_SIZE)) {
			const checked = await data.checkLease();
			if (checked.error) return checked;

			const results = await data.client
				.collections<IndexRecord>(data.collection)
				.documents()
				.import(records, {
					action: "upsert",
					dirty_values: "reject",
					throwOnFail: false,
				});
			const failures = results.filter((result) => !result.success);

			if (results.length !== records.length || failures.length > 0) {
				return {
					error: {
						message: copy("server:plugin.typesense.import.failed", {
							data: { count: failures.length || records.length },
						}),
					},
					data: undefined,
				};
			}
		}

		if (data.owners.length > 0) {
			const checked = await data.checkLease();
			if (checked.error) return checked;

			// Owners contain only percent-encoded identity components, never filter operators.
			await data.client
				.collections(data.collection)
				.documents()
				.delete({
					filter_by: `_lucid_owner:=[${data.owners.join(",")}] && _lucid_revision:!=${data.revision}`,
					batch_size: 100,
				});
		}
	} catch (error) {
		return { error: providerError(error), data: undefined };
	}

	return { error: undefined, data: undefined };
};

export default writeBatch;
