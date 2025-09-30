import T from "@/translations";
import serviceHelpers from "@/utils/service-helpers";
import spawnToast from "@/utils/spawn-toast";
import request from "@/utils/request";
import type { ResponseBody } from "@types";

interface Params {
	id: number;
}

export const resendSingleReq = (params: Params) => {
	return request<
		ResponseBody<{
			jobId: string;
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
			jobId: string;
		}>
	>({
		mutationFn: resendSingleReq,
		invalidates: ["email.getMultiple", "email.getSingle"],
		onSuccess: () => {
			spawnToast({
				title: T()("email_resent_toast_title"),
				message: T()("email_resent_toast_message"),
				status: "success",
			});
			props.onSuccess?.();
		},
		onError: props.onError,
	});
};

export default useResendSingle;
