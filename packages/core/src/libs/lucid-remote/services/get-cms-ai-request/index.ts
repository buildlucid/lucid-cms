import type { ServiceFn } from "../../../../utils/services/types.js";
import { copy } from "../../../i18n/index.js";
import { getLucidRemoteClient } from "../../client.js";
import { lucidRemotePaths } from "../../constants.js";
import { parseCmsAiRemoteData } from "../../schema/ai.js";
import type { LucidRemoteRequestData } from "../../types.js";
import type { CmsAiGenerateData } from "../generate-cms-ai/type.js";
import type { GetCmsAiRequestProps } from "./type.js";

/**
 * Checks the status/result of a persisted CMS AI generation request.
 */
const getCmsAiRequest: ServiceFn<
	[GetCmsAiRequestProps],
	LucidRemoteRequestData<CmsAiGenerateData>
> = async (context, props) => {
	const client = getLucidRemoteClient(context);
	const headers = new Headers();

	headers.append("Authorization", `Bearer ${props.accessToken}`);

	const result = await client.request<unknown>(
		`${lucidRemotePaths.getCmsAiRequest}/${encodeURIComponent(
			props.requestId,
		)}`,
		{
			retries: 0,
			method: "GET",
			headers,
		},
	);
	if (result.error) return result;

	const parsed = parseCmsAiRemoteData(result.data.json, {
		feature: {
			key: "media.image.generate",
			version: "v1",
		},
		requestId: props.requestId,
	});
	if (!parsed) {
		return {
			error: {
				type: "basic",
				status: 502,
				message: copy("server:core.routes.ai.generate.error.message"),
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: {
			response: result.data.response,
			json: {
				...result.data.json,
				data: parsed as CmsAiGenerateData,
			},
		},
	};
};

export type * from "./type.js";
export default getCmsAiRequest;
