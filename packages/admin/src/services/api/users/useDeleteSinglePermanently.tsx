import type { ResponseBody, Role } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	id: number;
}

export const deleteSinglePermanentlyReq = (params: Params) => {
	return request<ResponseBody<Role>>({
		url: `/lucid/api/v1/users/${params.id}/permanent`,
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

const useDeleteSinglePermanently = (props: UseDeleteProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<Role>>({
		mutationFn: deleteSinglePermanentlyReq,
		getSuccessToast: () => ({
			title: T()("toasts.users.deleted.title"),
			message: T()("toasts.users.deleted.message"),
		}),
		invalidates: ["users.getMultiple", "users.getSingle"],
		onSuccess: props.onSuccess,
		onError: props.onError,
	});
};

export default useDeleteSinglePermanently;
