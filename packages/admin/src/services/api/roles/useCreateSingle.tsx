import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { ResponseBody, RoleResponse } from "@types";

interface Params {
	name: string;
	permissions: string[];
}

export const createSingleReq = (params: Params) => {
	return request<ResponseBody<RoleResponse>>({
		url: "/api/v1/roles",
		csrf: true,
		config: {
			method: "POST",
			body: params,
		},
	});
};

interface UseCreateSingleProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useCreateSingle = (props?: UseCreateSingleProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<RoleResponse>>({
		mutationFn: createSingleReq,
		getSuccessToast: () => ({
			title: T()("role_created_toast_title"),
			message: T()("role_created_toast_message"),
		}),
		invalidates: ["roles.getMultiple"],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useCreateSingle;
