import type { ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	name: string;
	description: string;
	enabled: boolean;
	scopes: string[];
}

interface CreateSingleResponse {
	apiKey: string;
}

export const createSingleReq = (params: Params) => {
	return request<ResponseBody<CreateSingleResponse>>({
		url: "/lucid/api/v1/client-integrations",
		csrf: true,
		config: {
			method: "POST",
			body: params,
		},
	});
};

interface UseCreateSingleProps {
	onSuccess?: (data: ResponseBody<CreateSingleResponse>) => void;
	onError?: () => void;
}

const useCreateSingle = (props?: UseCreateSingleProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<CreateSingleResponse>
	>({
		mutationFn: createSingleReq,
		getSuccessToast: () => ({
			title: T()("integration_created_toast_title"),
			message: T()("integration_created_toast_message"),
		}),
		invalidates: ["clientIntegrations.getAll"],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useCreateSingle;
