import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { ResponseBody } from "@types";

interface Params {
	id: number;
}
interface ResponseBodyVal {
	apiKey: string;
}

export const regenerateKeyReq = (params: Params) => {
	return request<ResponseBody<ResponseBodyVal>>({
		url: `/api/v1/client-integrations/${params.id}/regenerate-keys`,
		csrf: true,
		config: {
			method: "POST",
		},
	});
};

interface UseGenerateAPIKeyProps {
	onSuccess?: (data: ResponseBody<ResponseBodyVal>) => void;
	onError?: () => void;
}

const useRegenerateAPIKey = (props: UseGenerateAPIKeyProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<ResponseBodyVal>
	>({
		mutationFn: regenerateKeyReq,
		getSuccessToast: () => ({
			title: T()("regenerate_api_key_toast_title"),
			message: T()("regenerate_api_key_toast_message"),
		}),
		invalidates: ["clientIntegrations.getAll"],
		onSuccess: props.onSuccess,
		onError: props.onError,
	});
};

export default useRegenerateAPIKey;
