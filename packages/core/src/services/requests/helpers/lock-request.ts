import { copy } from "../../../libs/i18n/index.js";
import { RequestsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Locks a request for one writer until the transaction commits or rolls back.
 * @remarks Call inside a transaction; repeated locks in that transaction are safe.
 */
const lockRequest: ServiceFn<[{ id: number }], undefined> = async (
	context,
	data,
) => {
	const Requests = new RequestsRepository(context.db);

	const lockRes = await Requests.lock({ id: data.id });
	if (lockRes.error) return lockRes;

	if (!lockRes.data) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.not.found"),
				status: 404,
			},
			data: undefined,
		};
	}

	return { error: undefined, data: undefined };
};

export default lockRequest;
