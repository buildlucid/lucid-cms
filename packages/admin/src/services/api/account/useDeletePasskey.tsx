import type { ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	id: number;
}

export const deletePasskeyReq = (params: Params) => {
	return request<ResponseBody>({
		url: `/api/v1/account/passkeys/${params.id}`,
		csrf: true,
		method: "DELETE",
	});
};

interface UseDeletePasskeyProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useDeletePasskey = (props?: UseDeletePasskeyProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody>({
		mutationFn: deletePasskeyReq,
		getSuccessToast: () => ({
			title: T()("toasts.account.passkey.removed.title"),
			message: T()("toasts.account.passkey.removed.message"),
		}),
		invalidates: [queryKeys.account.session()],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useDeletePasskey;
