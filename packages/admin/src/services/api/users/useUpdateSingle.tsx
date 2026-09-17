import type { ResponseBody, User } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	id: number;
	body: {
		roleIds?: number[];
		superAdmin?: boolean;
		triggerPasswordReset?: boolean;
		isDeleted?: false;
		isLocked?: boolean;
	};
}

export const updateSingleReq = (params: Params) => {
	return request<ResponseBody<User>>({
		url: `/lucid/api/v1/users/${params.id}`,
		csrf: true,
		method: "PATCH",
		body: params.body,
	});
};

interface UseUpdateSingleProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useUpdateSingle = (props?: UseUpdateSingleProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<User>>({
		mutationFn: updateSingleReq,
		getSuccessToast: () => ({
			title: T()("toasts.users.update.title"),
			message: T()("toasts.users.update.message"),
		}),
		invalidates: [queryKeys.users.list(), queryKeys.users.detail()],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useUpdateSingle;
