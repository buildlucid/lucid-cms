import type { ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	id: number;
}

export const revokeRefreshTokensReq = (params: Params) => {
	return request<ResponseBody<{ message: string }>>({
		url: `/lucid/api/v1/users/${params.id}/revoke-refresh-tokens`,
		csrf: true,
		config: {
			method: "POST",
		},
	});
};

interface UseRevokeRefreshTokensProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useRevokeRefreshTokens = (props?: UseRevokeRefreshTokensProps) => {
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<{ message: string }>
	>({
		mutationFn: revokeRefreshTokensReq,
		getSuccessToast: () => ({
			title: T()("user_revoke_sessions_toast_title"),
			message: T()("user_revoke_sessions_toast_message"),
		}),
		invalidates: [
			"users.getMultiple",
			"users.getSingle",
			"userLogins.getMultiple",
		],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useRevokeRefreshTokens;
