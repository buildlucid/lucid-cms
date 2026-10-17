import type { MediaGenerateResponse, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export type MediaAudioGenerateBody = {
	/** Groups this attempt with others made in the same modal. */
	sessionId?: string;
	script: string;
	instruction?: string;
	generation: {
		model?: string;
		voice?: string;
	};
};

interface Params {
	signal?: AbortSignal;
	shouldToast?: () => boolean;
	idempotencyKey: string;
	body: MediaAudioGenerateBody;
}

export const mediaAudioGenerateReq = (params: Params) => {
	return request<ResponseBody<MediaGenerateResponse>>({
		url: "/api/v1/ai/media/audio",
		csrf: true,
		method: "POST",
		body: params.body,
		signal: params.signal,
		headers: {
			"idempotency-key": params.idempotencyKey,
		},
	});
};

const useMediaAudioGenerate = () => {
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<MediaGenerateResponse>
	>({
		mutationFn: mediaAudioGenerateReq,
		invalidates: [queryKeys.ai.usage(), queryKeys.ai.credits()],
		getErrorToast: (_error, params) =>
			params.shouldToast?.() === false
				? undefined
				: {
						title: T()("toasts.ai.media.generate.error.title"),
						message: T()("toasts.ai.media.generate.error.message"),
					},
	});
};

export default useMediaAudioGenerate;
