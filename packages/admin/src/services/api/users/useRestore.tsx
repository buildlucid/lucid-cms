import type { ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	body: {
		ids: Array<number>;
	};
}

export const restoreReq = (params: Params) => {
	return request<ResponseBody>({
		url: "/lucid/api/v1/users/restore",
		csrf: true,
		config: {
			method: "POST",
			body: params.body,
		},
	});
};

interface UseRestoreProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useRestore = (props?: UseRestoreProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody>({
		mutationFn: restoreReq,
		getSuccessToast: () => ({
			title: T()("toasts.users.restore.title"),
			message: T()("toasts.users.restore.message"),
		}),
		invalidates: ["users.getMultiple"],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useRestore;
