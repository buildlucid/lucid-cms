import type { ServiceContext } from "../../../../utils/services/types.js";
import {
	type RemoteConnectionData,
	remoteConnectionResponseSchema,
} from "../../schema/connection.js";
import type { RemoteResult } from "../../types.js";
import { getLucidConnectionUrls } from "./config.js";
import { requestConnectionJson } from "./request.js";

/** Fetches the authenticated Website organisation and connection identity. */
export const fetchRemoteConnection = async (
	context: ServiceContext,
	accessToken: string,
): Promise<RemoteResult<RemoteConnectionData>> => {
	const urls = getLucidConnectionUrls(context);
	const result = await requestConnectionJson(
		urls.connectionUrl,
		{
			method: "GET",
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		},
		remoteConnectionResponseSchema,
		"protected_resource_invalid",
	);
	if (!result.ok) return result;
	if (result.data.data.resource !== urls.resource) {
		return {
			ok: false,
			status: 502,
			error: "protected_resource_invalid",
			transient: false,
		};
	}
	return {
		ok: true,
		status: result.status,
		data: result.data.data,
	};
};
