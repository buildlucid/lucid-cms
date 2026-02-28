import { useNavigate } from "@solidjs/router";
import type { ResponseBody } from "@types";
import userStore from "@/store/userStore";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import { clearCsrfSession } from "../auth/useCsrf";

export const revokeRefreshTokensReq = () => {
	return request<ResponseBody<{ message: string }>>({
		url: "/lucid/api/v1/account/revoke-refresh-tokens",
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
	const navigate = useNavigate();

	return serviceHelpers.useMutationWrapper<
		unknown,
		ResponseBody<{ message: string }>
	>({
		mutationFn: revokeRefreshTokensReq,
		getSuccessToast: () => ({
			title: T()("account_revoke_sessions_toast_title"),
			message: T()("account_revoke_sessions_toast_message"),
		}),
		onSuccess: () => {
			userStore.get.reset();
			clearCsrfSession();
			navigate("/lucid/login");
			props?.onSuccess?.();
		},
		onError: props?.onError,
	});
};

export default useRevokeRefreshTokens;
