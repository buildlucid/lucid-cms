import type { ResponseBody, Role } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	name: string;
	description?: string | null;
	permissions: string[];
}

export const createSingleReq = (params: Params) => {
	return request<ResponseBody<Role>>({
		url: "/lucid/api/v1/roles",
		csrf: true,
		method: "POST",
		body: params,
	});
};

interface UseCreateSingleProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useCreateSingle = (props?: UseCreateSingleProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<Role>>({
		mutationFn: createSingleReq,
		getSuccessToast: () => ({
			title: T()("toasts.roles.created.title"),
			message: T()("toasts.roles.created.message"),
		}),
		invalidates: [queryKeys.roles.list()],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useCreateSingle;
