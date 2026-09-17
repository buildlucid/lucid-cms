import type { ResponseBody, Role } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	id: number;
}

export const deleteSingleReq = (params: Params) => {
	return request<ResponseBody<Role>>({
		url: `/lucid/api/v1/roles/${params.id}`,
		csrf: true,
		method: "DELETE",
	});
};

interface UseDeleteProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useDeleteSingle = (props: UseDeleteProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<Role>>({
		mutationFn: deleteSingleReq,
		getSuccessToast: () => ({
			title: T()("toasts.roles.deleted.title"),
			message: T()("toasts.roles.deleted.message"),
		}),
		invalidates: [queryKeys.roles.list(), queryKeys.roles.detail()],
		onSuccess: props.onSuccess,
		onError: props.onError,
	});
};

export default useDeleteSingle;
