import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { ResponseBody, UserResponse } from "@lucidcms/core/types";

interface Params {
	id: number;
	body: {
		roleIds?: number[];
		superAdmin?: 1 | 0;
		triggerPasswordReset?: 1 | 0;
		isDeleted?: 0;
	};
}

export const updateSingleReq = (params: Params) => {
	return request<ResponseBody<UserResponse>>({
		url: `/api/v1/users/${params.id}`,
		csrf: true,
		config: {
			method: "PATCH",
			body: params.body,
		},
	});
};

interface UseUpdateSingleProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useUpdateSingle = (props?: UseUpdateSingleProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<UserResponse>>({
		mutationFn: updateSingleReq,
		getSuccessToast: () => ({
			title: T()("user_update_toast_title"),
			message: T()("user_update_toast_message"),
		}),
		invalidates: ["users.getMultiple", "users.getSingle"],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useUpdateSingle;
