import type { CmsAiGenerateRequestFeature } from "../generate-cms-ai/type.js";

export type GetCmsAiRequestProps = {
	accessToken: string;
	requestId: string;
	/** The feature the request was made for, which the response must match. */
	feature: CmsAiGenerateRequestFeature;
	signal?: AbortSignal;
};
