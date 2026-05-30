import type { ResponseBody } from "../../types/response.js";

export type {
	CmsAiGenerateData,
	CmsAiGenerateRequest,
	CmsAiGenerateRequestFeature,
	CmsAiGenerateRequestInput,
	CmsAiGenerateRequestInputImage,
	CmsAiGenerateRequestInputText,
	CmsAiGenerateRequestItem,
	CustomFieldInputV1Request,
	MediaAltGenerateV1Request,
	MediaImageGenerateV1Request,
} from "./services/generate-cms-ai.js";
export type { VerifyCmsLicenseData } from "./services/verify-cms-license.js";

export type LucidRemoteRequestData<T> = {
	response: Response;
	json: ResponseBody<T>;
};
