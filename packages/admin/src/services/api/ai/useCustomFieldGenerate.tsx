import type { CustomFieldInputGenerateResponse, ResponseBody } from "@types";
import type { CustomFieldGenerationDocument } from "@/store/aiModalsStore";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	signal?: AbortSignal;
	shouldToast?: () => boolean;
	body: {
		instruction?: string;
		guidance?: string;
		value: Record<string, unknown>;
		document?: CustomFieldGenerationDocument;
		target: {
			collectionKey: string;
			brickKey?: string;
			fieldKey: string;
		};
		locale: {
			source?: string;
			target: string[];
		};
	};
}

export const customFieldGenerateReq = (params: Params) => {
	return request<ResponseBody<CustomFieldInputGenerateResponse>>({
		url: "/lucid/api/v1/ai/custom-field",
		csrf: true,
		config: {
			method: "POST",
			body: params.body,
			signal: params.signal,
		},
	});
};

const useCustomFieldGenerate = () => {
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<CustomFieldInputGenerateResponse>
	>({
		mutationFn: customFieldGenerateReq,
		invalidates: ["ai.getUsage", "ai.getUsageChart"],
		getSuccessToast: (_data, params) =>
			params.shouldToast?.() === false
				? undefined
				: {
						title: T()("toasts.ai.custom.field.generate.success.title"),
						message: T()("toasts.ai.custom.field.generate.success.message"),
					},
	});
};

export default useCustomFieldGenerate;
