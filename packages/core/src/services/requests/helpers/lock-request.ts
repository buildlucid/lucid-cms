import { randomUUID } from "node:crypto";
import { copy } from "../../../libs/i18n/index.js";
import { RequestsRepository } from "../../../libs/repositories/index.js";
import LucidAPIError from "../../../utils/errors/lucid-api-error.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Claims a request for one writer at a time. Use `await using` inside a
 * transaction so the claim is released before commit or rollback.
 */
const lockRequest: ServiceFn<[{ id: number }], AsyncDisposableStack> = async (
	context,
	data,
) => {
	const Requests = new RequestsRepository(context.db);

	const token = randomUUID();
	const lockRes = await Requests.lock({ id: data.id, token });
	if (lockRes.error) return lockRes;

	if (lockRes.data === 0) {
		const requestRes = await Requests.selectSingle({
			select: ["id"],
			where: [{ key: "id", operator: "=", value: data.id }],
		});
		if (requestRes.error) return requestRes;

		return {
			error: {
				type: "basic",
				message: requestRes.data
					? copy("server:core.requests.locked")
					: copy("server:core.requests.not.found"),
				status: requestRes.data ? 409 : 404,
			},
			data: undefined,
		};
	}

	const lock = new AsyncDisposableStack();
	lock.defer(async () => {
		const unlockRes = await Requests.unlock({ id: data.id, token });
		if (unlockRes.error) throw new LucidAPIError(unlockRes.error);
	});

	return { error: undefined, data: lock };
};

export default lockRequest;
