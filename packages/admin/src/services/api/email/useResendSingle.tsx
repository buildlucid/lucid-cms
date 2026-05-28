import type { ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import spawnToast from "@/utils/spawn-toast";

interface Params {
	id: number;
}

export const resendSingleReq = (params: Params) => {
	return request<
		ResponseBody<{
			jobId: string;
		}>
	>({
		url: `/lucid/api/v1/emails/${params.id}/resend`,
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
				title: T()("toasts.email.resent.title"),
				message: T()("toasts.email.resent.message"),
				status: "success",
			});
			props.onSuccess?.();
		},
		onError: props.onError,
	});
};

export default useResendSingle;
