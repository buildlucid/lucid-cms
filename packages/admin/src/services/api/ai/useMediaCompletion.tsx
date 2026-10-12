import type { MediaGenerateCompletionPollResponse, ResponseBody } from "@types";
import request from "@/utils/request";

interface Params {
	requestId: string;
	signal?: AbortSignal;
}

/** Checks on a media generation, returning its file once Lucid finishes it. */
export const mediaCompletionReq = (params: Params) => {
	return request<ResponseBody<MediaGenerateCompletionPollResponse>>({
		url: `/lucid/api/v1/ai/media/requests/${params.requestId}`,
		csrf: true,
		method: "POST",
		signal: params.signal,
	});
};
