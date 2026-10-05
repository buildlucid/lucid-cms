import { randomUUID } from "node:crypto";
import { copy } from "../../../libs/i18n/index.js";
import { ReleasesRepository } from "../../../libs/repositories/index.js";
import LucidAPIError from "../../../utils/errors/lucid-api-error.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Claims a release for one writer at a time. Use `await using` inside a
 * transaction so the claim is released before commit or rollback.
 */
const lockRelease: ServiceFn<[{ id: number }], AsyncDisposableStack> = async (
	context,
	data,
) => {
	const Releases = new ReleasesRepository(context.db);

	const token = randomUUID();
	const lockRes = await Releases.lock({ id: data.id, token });
	if (lockRes.error) return lockRes;

	if (lockRes.data === 0) {
		const releaseRes = await Releases.selectSingle({
			select: ["id"],
			where: [{ key: "id", operator: "=", value: data.id }],
		});
		if (releaseRes.error) return releaseRes;

		return {
			error: {
				type: "basic",
				message: releaseRes.data
					? copy("server:core.releases.locked")
					: copy("server:core.releases.not.found"),
				status: releaseRes.data ? 409 : 404,
			},
			data: undefined,
		};
	}

	const lock = new AsyncDisposableStack();
	lock.defer(async () => {
		const unlockRes = await Releases.unlock({ id: data.id, token });
		if (unlockRes.error) throw new LucidAPIError(unlockRes.error);
	});

	return { error: undefined, data: lock };
};

export default lockRelease;
