import type {
	MediaImageGenerateCompletionPollResponse,
	ResponseBody,
} from "@types";
import request from "@/utils/request";

interface Params {
	requestId: string;
	signal?: AbortSignal;
}

export const mediaImageCompletionReq = (params: Params) => {
	return request<ResponseBody<MediaImageGenerateCompletionPollResponse>>({
		url: `/lucid/api/v1/ai/media-image/${params.requestId}`,
		csrf: true,
		config: {
			method: "POST",
			signal: params.signal,
		},
	});
};
