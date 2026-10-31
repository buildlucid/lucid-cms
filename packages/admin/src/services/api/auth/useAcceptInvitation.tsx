import { useNavigate } from "@solidjs/router";
import { useQueryClient } from "@tanstack/solid-query";
import type { LoginResult, ResponseBody } from "@types";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	token: string;
	/** Leave the password out when password login is disabled. */
	body: {
		password?: string;
		passwordConfirmation?: string;
	};
	captchaToken?: string;
}

export const acceptInvitationReq = (params: Params) => {
	return request<ResponseBody<LoginResult>>({
		url: `/api/v1/auth/invitation/accept/${params.token}`,
		csrf: true,
		method: "POST",
		body: params.body,
		captchaToken: params.captchaToken,
	});
};

interface UseAcceptInvitationProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useAcceptInvitation = (props?: UseAcceptInvitationProps) => {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	return serviceHelpers.useMutationWrapper<Params, ResponseBody<LoginResult>>({
		mutationFn: acceptInvitationReq,
		onSuccess: (res, params) => {
			//* accepting without a password logs the user in, after any two-factor step
			if (params.body.password !== undefined) {
				navigate("/admin/login");
			} else if (res.data.twoFactor) {
				navigate("/admin/two-factor");
			} else {
				queryClient.clear();
				navigate("/admin");
			}
			props?.onSuccess?.();
		},
		onError: props?.onError,
	});
};

export default useAcceptInvitation;
