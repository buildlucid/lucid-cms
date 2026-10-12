import type {
	CmsAiActor,
	CmsAiGenerateAcceptedData,
	CmsAiGenerateCompletedData,
	CmsAiGenerateData,
} from "./services/generate-cms-ai/type.js";

export const isCmsAiGenerateCompletedData = (
	data: CmsAiGenerateData,
): data is CmsAiGenerateCompletedData => "output" in data && "usage" in data;

export const isCmsAiGenerateAcceptedData = (
	data: CmsAiGenerateData,
): data is CmsAiGenerateAcceptedData =>
	data.mode === "async" &&
	(data.status === "queued" || data.status === "processing");

/** Returns a user actor when an ID is supplied, otherwise the system actor. */
export const cmsAiActor = (userId: number | null): CmsAiActor =>
	userId === null ? { type: "system" } : { type: "user", id: userId };
