import type { ResponseBody, SavedGeneratedMedia } from "@types";
import request from "@/utils/request";

interface Params {
	requestId: string;
	/** Match the visibility of the media the file will create. */
	public: boolean;
	/** Use a temporary key, for replacing an existing media item's file. */
	temporary?: boolean;
	signal?: AbortSignal;
}

/** Copies a finished generation into media storage, returning a key to create or update media with. */
export const mediaSaveReq = (params: Params) => {
	return request<ResponseBody<SavedGeneratedMedia>>({
		url: `/api/v1/ai/media/generations/${params.requestId}/save`,
		csrf: true,
		method: "POST",
		body: { public: params.public, temporary: params.temporary },
		signal: params.signal,
	});
};
