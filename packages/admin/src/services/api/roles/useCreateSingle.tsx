import type { ResponseBody, Role } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	name: {
		localeCode: string | null;
		value: string | null;
	}[];
	description?: {
		localeCode: string | null;
		value: string | null;
	}[];
	permissions: string[];
}

export const createSingleReq = (params: Params) => {
	return request<ResponseBody<Role>>({
		url: "/lucid/api/v1/roles",
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
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<Role>>({
		mutationFn: createSingleReq,
		getSuccessToast: () => ({
			title: T()("toasts.roles.created.title"),
			message: T()("toasts.roles.created.message"),
		}),
		invalidates: ["roles.getMultiple"],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useCreateSingle;
