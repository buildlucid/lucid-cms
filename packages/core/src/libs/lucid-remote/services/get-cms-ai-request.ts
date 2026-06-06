import type { ServiceFn } from "../../../utils/services/types.js";
import { getLucidRemoteClient } from "../client.js";
import { lucidRemotePaths } from "../constants.js";
import type { LucidRemoteRequestData } from "../types.js";
import type { CmsAiGenerateData } from "./generate-cms-ai.js";

type GetCmsAiRequestProps = {
	licenseKey: string;
	requestId: string;
};

/**
 * Checks the status/result of a persisted CMS AI generation request.
 */
const getCmsAiRequest: ServiceFn<
	[GetCmsAiRequestProps],
	LucidRemoteRequestData<CmsAiGenerateData>
> = async (context, props) => {
	const client = getLucidRemoteClient(context);
	const headers = new Headers();

	headers.append("Authorization", `Bearer ${props.licenseKey}`);

	return client.request<CmsAiGenerateData>(
		`${lucidRemotePaths.getCmsAiRequest}/${encodeURIComponent(
			props.requestId,
		)}`,
		{
			retries: 0,
			method: "GET",
			headers,
		},
	);
};

export default getCmsAiRequest;
