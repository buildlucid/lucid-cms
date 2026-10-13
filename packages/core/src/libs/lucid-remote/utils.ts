import type {
	CmsAiGenerateAcceptedData,
	CmsAiGenerateCompletedData,
	CmsAiGenerateData,
} from "./schema/ai.js";
import type { CmsAiActor } from "./services/generate-cms-ai/type.js";

/** Completed AI requests with token usage rather than web-request usage. */
export const isCmsAiGenerateCompletedData = (
	data: CmsAiGenerateData,
): data is CmsAiGenerateCompletedData =>
	"usage" in data && !("kind" in data.usage);

export const isCmsAiGenerateAcceptedData = (
	data: CmsAiGenerateData,
): data is CmsAiGenerateAcceptedData =>
	data.status === "queued" || data.status === "processing";

/** Returns a user actor when an ID is supplied, otherwise the system actor. */
export const cmsAiActor = (userId: number | null): CmsAiActor =>
	userId === null ? { type: "system" } : { type: "user", id: userId };
