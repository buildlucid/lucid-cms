import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { ResponseBody, UserResponse } from "@lucidcms/core/types";

interface Params {
	body: {
		email: string;
		username: string;
		firstName?: string;
		lastName?: string;
		superAdmin?: 1 | 0;
		roleIds: number[];
	};
}

export const createSingleReq = (params: Params) => {
	return request<ResponseBody<UserResponse>>({
		url: "/api/v1/users",
		csrf: true,
		config: {
			method: "POST",
			body: params.body,
		},
	});
};

interface UseUpdateSingleProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useCreateSingle = (props?: UseUpdateSingleProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<UserResponse>>({
		mutationFn: createSingleReq,
		getSuccessToast: () => ({
			title: T()("user_create_toast_title"),
			message: T()("user_create_toast_message"),
		}),
		invalidates: ["users.getMultiple"],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useCreateSingle;
