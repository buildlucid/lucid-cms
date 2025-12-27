import type { ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	body: {
		email: string;
		username: string;
		firstName?: string;
		lastName?: string;
		superAdmin?: boolean;
		roleIds: number[];
	};
}

export const createSingleReq = (params: Params) => {
	return request<ResponseBody>({
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
	return serviceHelpers.useMutationWrapper<Params, ResponseBody>({
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
