import type { LucidUser } from "../../types/hono.js";
import type { UserDisplay } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getRequestReaders from "./helpers/get-request-readers.js";
import loadRequest from "./helpers/load-request.js";

/** Lists people who can be mentioned in a request's comments, by name or ID. */
const getMentionableUsers: ServiceFn<
	[
		{
			id: number;
			user: LucidUser;
			ids?: number[];
			name?: string;
			limit?: number;
		},
	],
	UserDisplay[]
> = async (context, data) => {
	const requestRes = await loadRequest(context, data);
	if (requestRes.error) return requestRes;

	return getRequestReaders(context, {
		request: requestRes.data,
		ids: data.ids,
		name: data.name,
		limit: data.limit,
	});
};

export default getMentionableUsers;
