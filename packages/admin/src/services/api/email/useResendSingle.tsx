import T from "@/translations";
import serviceHelpers from "@/utils/service-helpers";
import spawnToast from "@/utils/spawn-toast";
import request from "@/utils/request";
import type { ResponseBody } from "@lucidcms/core/types";

interface Params {
	id: number;
}

export const resendSingleReq = (params: Params) => {
	return request<
		ResponseBody<{
			success: boolean;
			message: string;
		}>
	>({
		url: `/api/v1/emails/${params.id}/resend`,
		csrf: true,
		config: {
			method: "POST",
		},
	});
};

interface UseResendSingleProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useResendSingle = (props: UseResendSingleProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<{
			success: boolean;
			message: string;
		}>
	>({
		mutationFn: resendSingleReq,
		invalidates: ["email.getMultiple", "email.getSingle"],
		onSuccess: (data) => {
			if (data.data.success) {
				spawnToast({
					title: T()("email_resent_toast_title"),
					message: T()("email_resent_toast_message"),
					status: "success",
				});
				props.onSuccess?.();
			} else {
				spawnToast({
					title: T()("email_resent_toast_error_title"),
					message: T()("email_resent_toast_error_message"),
					status: "error",
				});
			}
		},
		onError: props.onError,
	});
};

export default useResendSingle;
