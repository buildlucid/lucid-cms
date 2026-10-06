import type { LucidUser } from "../../types/hono.js";
import type { RequestUser } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getRequestReaders from "./helpers/get-request-readers.js";
import loadRequest from "./helpers/load-request.js";

const getMentionableUsers: ServiceFn<
	[{ id: number; user: LucidUser }],
	RequestUser[]
> = async (context, data) => {
	const requestRes = await loadRequest(context, data);
	if (requestRes.error) return requestRes;

	return getRequestReaders(context, { request: requestRes.data });
};

export default getMentionableUsers;
