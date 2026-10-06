import type { LucidUser } from "../../types/hono.js";
import type { ReleaseUser } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getReleaseReaders from "./helpers/get-release-readers.js";
import loadRelease from "./helpers/load-release.js";

const getMentionableUsers: ServiceFn<
	[{ id: number; user: LucidUser }],
	ReleaseUser[]
> = async (context, data) => {
	const releaseRes = await loadRelease(context, data);
	if (releaseRes.error) return releaseRes;

	return getReleaseReaders(context, { release: releaseRes.data });
};

export default getMentionableUsers;
