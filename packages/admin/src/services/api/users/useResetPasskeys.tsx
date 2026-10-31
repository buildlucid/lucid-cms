import type { ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	id: number;
}

export const resetPasskeysReq = (params: Params) => {
	return request<ResponseBody>({
		url: `/api/v1/users/${params.id}/passkeys`,
		csrf: true,
		method: "DELETE",
	});
};

interface UseResetPasskeysProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useResetPasskeys = (props?: UseResetPasskeysProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody>({
		mutationFn: resetPasskeysReq,
		getSuccessToast: () => ({
			title: T()("toasts.users.passkeys.reset.title"),
			message: T()("toasts.users.passkeys.reset.message"),
		}),
		invalidates: [queryKeys.users.list(), queryKeys.users.detail()],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useResetPasskeys;
