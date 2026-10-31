import type { ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	id: number;
	body: {
		name: string;
	};
}

export const updatePasskeyReq = (params: Params) => {
	return request<ResponseBody>({
		url: `/api/v1/account/passkeys/${params.id}`,
		csrf: true,
		method: "PATCH",
		body: params.body,
	});
};

interface UseUpdatePasskeyProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useUpdatePasskey = (props?: UseUpdatePasskeyProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody>({
		mutationFn: updatePasskeyReq,
		getSuccessToast: () => ({
			title: T()("toasts.account.passkey.renamed.title"),
			message: T()("toasts.account.passkey.renamed.message"),
		}),
		invalidates: [queryKeys.account.session()],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useUpdatePasskey;
