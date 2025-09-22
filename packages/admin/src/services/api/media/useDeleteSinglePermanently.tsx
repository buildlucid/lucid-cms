import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { ResponseBody, RoleResponse } from "@types";

interface Params {
	id: number;
}

export const deleteSinglePermanentlyReq = (params: Params) => {
	return request<ResponseBody<RoleResponse>>({
		url: `/api/v1/media/${params.id}/permanent`,
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
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<RoleResponse>>({
		mutationFn: deleteSinglePermanentlyReq,
		getSuccessToast: () => ({
			title: T()("media_deleted_toast_title"),
			message: T()("media_deleted_toast_message"),
		}),
		invalidates: ["media.getMultiple"],
		onSuccess: props.onSuccess,
		onError: props.onError,
	});
};

export default useDeleteSinglePermanently;
