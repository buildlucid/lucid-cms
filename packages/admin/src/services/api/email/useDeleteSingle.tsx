import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { ResponseBody, EmailResponse } from "@types";

interface Params {
	id: number;
}

export const deleteSingleReq = (params: Params) => {
	return request<ResponseBody<EmailResponse>>({
		url: `/api/v1/emails/${params.id}`,
		csrf: true,
		config: {
			method: "DELETE",
		},
	});
};

interface UseDeleteProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useDeleteSingle = (props: UseDeleteProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<EmailResponse>>(
		{
			mutationFn: deleteSingleReq,
			getSuccessToast: () => ({
				title: T()("email_deleted_toast_title"),
				message: T()("email_deleted_toast_message"),
			}),
			invalidates: ["email.getMultiple"],
			onSuccess: props.onSuccess,
			onError: props.onError,
		},
	);
};

export default useDeleteSingle;
