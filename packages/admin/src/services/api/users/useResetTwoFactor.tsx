import type { ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	id: number;
}

export const resetTwoFactorReq = (params: Params) => {
	return request<ResponseBody>({
		url: `/api/v1/users/${params.id}/reset-two-factor`,
		csrf: true,
		method: "POST",
	});
};

interface UseResetTwoFactorProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useResetTwoFactor = (props?: UseResetTwoFactorProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody>({
		mutationFn: resetTwoFactorReq,
		getSuccessToast: () => ({
			title: T()("toasts.users.two.factor.reset.title"),
			message: T()("toasts.users.two.factor.reset.message"),
		}),
		invalidates: [queryKeys.users.list(), queryKeys.users.detail()],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useResetTwoFactor;
