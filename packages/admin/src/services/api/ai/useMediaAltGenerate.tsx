import type { ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	body: {
		image: {
			data: string;
			mimeType: "image/webp";
			detail: "low" | "high" | "auto";
			filename?: string;
		};
		media: {
			id?: string | number;
			name?: Record<string, string>;
			alt?: Record<string, string>;
		};
		locale: {
			source?: string;
			target: string[];
		};
	};
}

export type MediaAltGenerateResponse = {
	requestId: string;
	feature: {
		key: "media.alt.generate";
		version: "v1";
	};
	output: Record<string, string>;
	usage: {
		model: string;
		providerRequestId?: string;
		tokens: {
			input: {
				text: number;
				image: number;
				audio: number;
				cached: {
					total: number;
					text: number;
					image: number;
					audio: number;
				};
				total: number;
			};
			output: {
				text: number;
				image: number;
				audio: number;
				reasoning: number;
				acceptedPrediction: number;
				rejectedPrediction: number;
				total: number;
			};
			total: number;
		};
		cost: {
			currency: string;
			totalCostMinor: number;
		};
	};
};

export const mediaAltGenerateReq = (params: Params) => {
	return request<ResponseBody<MediaAltGenerateResponse>>({
		url: "/lucid/api/v1/ai/media-alt",
		csrf: true,
		config: {
			method: "POST",
			body: params.body,
		},
	});
};

const useMediaAltGenerate = () => {
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<MediaAltGenerateResponse>
	>({
		mutationFn: mediaAltGenerateReq,
		getSuccessToast: () => ({
			title: T()("toasts.ai.media.alt.generate.success.title"),
			message: T()("toasts.ai.media.alt.generate.success.message"),
		}),
	});
};

export default useMediaAltGenerate;
