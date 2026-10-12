import type { MediaGenerateResponse, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export type MediaImageGenerateBody = {
	/** Groups this attempt with others made in the same modal. */
	sessionId?: string;
	instruction: string;
	guidance?: string;
	previousInstructions?: string[];
	image?:
		| {
				type: "url";
				url: string;
				detail: "low" | "high" | "auto";
				filename?: string;
				mimeType?: "image/webp" | "image/png" | "image/jpeg";
		  }
		| {
				type: "base64";
				data: string;
				mimeType: "image/webp" | "image/png" | "image/jpeg";
				detail: "low" | "high" | "auto";
				filename?: string;
		  };
	generation: {
		model?: string;
		aspectRatio: string;
		/** Left out for the model's default. */
		resolution?: string;
		quality?: string;
		outputFormat?: string;
	};
};

interface Params {
	signal?: AbortSignal;
	shouldToast?: () => boolean;
	idempotencyKey: string;
	body: MediaImageGenerateBody;
}

export const mediaImageGenerateReq = (params: Params) => {
	return request<ResponseBody<MediaGenerateResponse>>({
		url: "/lucid/api/v1/ai/media/image",
		csrf: true,
		method: "POST",
		body: params.body,
		signal: params.signal,
		headers: {
			"idempotency-key": params.idempotencyKey,
		},
	});
};

const useMediaImageGenerate = () => {
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<MediaGenerateResponse>
	>({
		mutationFn: mediaImageGenerateReq,
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

export default useMediaImageGenerate;
