import type { AiGeneratedContent } from "@lucidcms/types";
import type { MediaAltGenerateResponse, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	signal?: AbortSignal;
	shouldToast?: () => boolean;
	body: {
		instruction?: string;
		previousResponses?: {
			instruction?: string;
			output: AiGeneratedContent<string>;
		}[];
		image: {
			data: string;
			mimeType: "image/webp";
			detail: "low" | "high" | "auto";
			filename?: string;
		};
		media: {
			id?: string | number;
			name?: string | Record<string, string>;
			alt?: string | Record<string, string>;
		};
		locale: {
			source?: string;
			target: string[] | null;
		};
	};
}

export const mediaAltGenerateReq = (params: Params) => {
	return request<ResponseBody<MediaAltGenerateResponse>>({
		url: "/lucid/api/v1/ai/media-alt",
		csrf: true,
		method: "POST",
		body: params.body,
		signal: params.signal,
	});
};

const useMediaAltGenerate = () => {
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<MediaAltGenerateResponse>
	>({
		mutationFn: mediaAltGenerateReq,
		invalidates: [queryKeys.ai.usage(), queryKeys.ai.usageChart()],
		getSuccessToast: (_data, params) =>
			params.shouldToast?.() === false
				? undefined
				: {
						title: T()("toasts.ai.media.alt.generate.success.title"),
						message: T()("toasts.ai.media.alt.generate.success.message"),
					},
	});
};

export default useMediaAltGenerate;
