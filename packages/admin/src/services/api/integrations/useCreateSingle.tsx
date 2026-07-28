import type {
	IntegrationCreateResponse,
	IntegrationExpiry,
	ResponseBody,
} from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	name: string;
	description: string;
	enabled: boolean;
	expiry: IntegrationExpiry;
	scopes: string[];
}

export const createSingleReq = (params: Params) => {
	return request<ResponseBody<IntegrationCreateResponse>>({
		url: "/lucid/api/v1/integrations",
		csrf: true,
		config: {
			method: "POST",
			body: {
				name: params.name,
				description: params.description,
				enabled: params.enabled,
				expiry: params.expiry,
				scopes: params.scopes,
			},
		},
	});
};

interface UseCreateSingleProps {
	onSuccess?: (data: ResponseBody<IntegrationCreateResponse>) => void;
	onError?: () => void;
}

const useCreateSingle = (props?: UseCreateSingleProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<IntegrationCreateResponse>
	>({
		mutationFn: createSingleReq,
		getSuccessToast: () => ({
			title: T()("toasts.common.integration.created.title"),
			message: T()("toasts.common.integration.created.message"),
		}),
		invalidates: ["integrations.getAll"],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useCreateSingle;
