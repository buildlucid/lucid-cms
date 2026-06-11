import type {
	CmsAiGenerateAcceptedData,
	CmsAiGenerateCompletedData,
	CmsAiGenerateData,
	CmsAiGenerateFailedData,
} from "./services/generate-cms-ai.js";

export const isCmsAiGenerateCompletedData = (
	data: CmsAiGenerateData,
): data is CmsAiGenerateCompletedData => "output" in data && "usage" in data;

export const isCmsAiGenerateAcceptedData = (
	data: CmsAiGenerateData,
): data is CmsAiGenerateAcceptedData =>
	data.mode === "async" &&
	(data.status === "queued" || data.status === "processing");

export const isCmsAiGenerateFailedData = (
	data: CmsAiGenerateData,
): data is CmsAiGenerateFailedData => data.status === "failed";

export const getCmsAiGenerateFailedMessage = (
	data: CmsAiGenerateFailedData,
	fallback: string,
) => {
	const message = [data.errorMessage, data.error?.message, data.message].find(
		(item) => typeof item === "string" && item.trim().length > 0,
	);

	return message ?? fallback;
};
