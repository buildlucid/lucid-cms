import type { ResponseBody } from "../../types/response.js";

export type {
	CmsAiGenerateAcceptedData,
	CmsAiGenerateCompletedData,
	CmsAiGenerateData,
} from "./schema/ai.js";
export type {
	ConnectionGrant,
	ConnectionRegistration,
	RemoteConnectionData,
} from "./schema/connection.js";
export type {
	CmsAiActor,
	CmsAiGenerateRequest,
	CmsAiGenerateRequestFeature,
	CmsAiGenerateRequestInput,
	CmsAiGenerateRequestInputImage,
	CmsAiGenerateRequestInputText,
	MediaAltGenerateV1Request,
	MediaAudioGenerateV1Request,
	MediaImageGenerateV1Request,
} from "./services/generate-cms-ai/type.js";

export type LucidRemoteRequestData<T> = {
	response: Response;
	json: ResponseBody<T>;
};

export type RemoteResult<T> =
	| {
			ok: true;
			status: number;
			data: T;
	  }
	| {
			ok: false;
			status: number;
			error: string;
			description?: string;
			transient: boolean;
	  };
