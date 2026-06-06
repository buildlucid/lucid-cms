import type {
	CmsAiGenerateAcceptedData,
	CmsAiGenerateCompletedData,
	CmsAiGenerateData,
} from "./services/generate-cms-ai.js";

export const isCmsAiGenerateCompletedData = (
	data: CmsAiGenerateData,
): data is CmsAiGenerateCompletedData => "output" in data && "usage" in data;

export const isCmsAiGenerateAcceptedData = (
	data: CmsAiGenerateData,
): data is CmsAiGenerateAcceptedData =>
	data.mode === "async" &&
	(data.status === "queued" || data.status === "processing");
