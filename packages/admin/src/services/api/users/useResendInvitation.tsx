import type { ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	userId: number;
}

export const resendInvitationReq = (params: Params) => {
	return request<ResponseBody>({
		url: `/lucid/api/v1/users/${params.userId}/resend-invitation`,
		csrf: true,
		config: {
			method: "POST",
		},
	});
};

interface UseResendInvitationProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useResendInvitation = (props?: UseResendInvitationProps) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody>({
		mutationFn: resendInvitationReq,
		getSuccessToast: () => ({
			title: T()("toasts.users.resend.invitation.title"),
			message: T()("toasts.users.resend.invitation.message"),
		}),
		invalidates: ["users.getMultiple"],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useResendInvitation;
