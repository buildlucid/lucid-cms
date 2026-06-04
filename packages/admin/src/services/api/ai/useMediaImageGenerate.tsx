import type { MediaImageGenerateResponse, ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export type MediaImageGenerationSize =
	| "auto"
	| "1024x1024"
	| "1536x1024"
	| "1024x1536"
	| "2048x2048"
	| "2048x1152"
	| "3840x2160"
	| "2160x3840";

export type MediaImageGenerationQuality = "auto" | "low" | "medium" | "high";
export type MediaImageGenerationOutputFormat = "webp" | "png" | "jpeg";

export type MediaImageGenerateBody = {
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
		size: MediaImageGenerationSize;
		quality: MediaImageGenerationQuality;
		outputFormat: MediaImageGenerationOutputFormat;
	};
};

interface Params {
	signal?: AbortSignal;
	shouldToast?: () => boolean;
	body: MediaImageGenerateBody;
}

export const mediaImageGenerateReq = (params: Params) => {
	return request<ResponseBody<MediaImageGenerateResponse>>({
		url: "/lucid/api/v1/ai/media-image",
		csrf: true,
		config: {
			method: "POST",
			body: params.body,
			signal: params.signal,
		},
	});
};

const useMediaImageGenerate = () => {
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<MediaImageGenerateResponse>
	>({
		mutationFn: mediaImageGenerateReq,
		getSuccessToast: (_data, params) =>
			params.shouldToast?.() === false
				? undefined
				: {
						title: T()("toasts.ai.media.image.generate.success.title"),
						message: T()("toasts.ai.media.image.generate.success.message"),
					},
		getErrorToast: (_error, params) =>
			params.shouldToast?.() === false
				? undefined
				: {
						title: T()("toasts.ai.media.image.generate.error.title"),
						message: T()("toasts.ai.media.image.generate.error.message"),
					},
	});
};

export default useMediaImageGenerate;
