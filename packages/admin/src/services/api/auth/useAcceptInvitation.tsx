import { useNavigate } from "@solidjs/router";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { ResponseBody } from "@types";

interface Params {
	token: string;
	body: {
		password: string;
		passwordConfirmation: string;
	};
}

export const acceptInvitationReq = (params: Params) => {
	return request<ResponseBody>({
		url: `/api/v1/auth/invitation/accept/${params.token}`,
		csrf: true,
		config: {
			method: "POST",
			body: params.body,
		},
	});
};

interface UseAcceptInvitationProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useAcceptInvitation = (props?: UseAcceptInvitationProps) => {
	const navigate = useNavigate();

	return serviceHelpers.useMutationWrapper<Params, ResponseBody>({
		mutationFn: acceptInvitationReq,
		onSuccess: () => {
			navigate("/admin/login");
			props?.onSuccess?.();
		},
		onError: props?.onError,
	});
};

export default useAcceptInvitation;
