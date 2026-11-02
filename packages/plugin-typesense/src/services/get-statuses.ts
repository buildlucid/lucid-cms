import type { ServiceFn } from "@lucidcms/core/types";
import getStatus, {
	type TypesenseStatus,
} from "../toolkit/get-status/index.js";
import type { ResolvedOptions } from "../types.js";

/** Reads every index's status, stopping at the first that can't be read. */
const getStatuses: ServiceFn<
	[{ options: Pick<ResolvedOptions, "indexes"> }],
	TypesenseStatus[]
> = async (context, data) => {
	const statuses = [];
	for (const { key } of data.options.indexes) {
		const status = await getStatus(context, { index: key }, data.options);
		if (status.error) return status;

		statuses.push(status.data);
	}

	return { error: undefined, data: statuses };
};

export default getStatuses;
