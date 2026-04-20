import type { ResponseBody, Role } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	id: number;
	collectionKey: string;
}

export const deleteSinglePermanentlyReq = (params: Params) => {
	return request<ResponseBody<Role>>({
		url: `/lucid/api/v1/documents/${params.collectionKey}/${params.id}/permanent`,
		csrf: true,
		config: {
			method: "DELETE",
		},
	});
};

interface UseDeleteProps {
	onSuccess?: () => void;
	onError?: () => void;
	getCollectionName: () => string;
}

const useDeleteSinglePermanently = (props: UseDeleteProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<Role>>({
		mutationFn: deleteSinglePermanentlyReq,
		getSuccessToast: () => ({
			title: T()("deleted_toast_title", {
				name: props.getCollectionName(),
			}),
			message: T()("deleted_toast_message", {
				name: props.getCollectionName().toLowerCase(),
			}),
		}),
		invalidates: ["documents.getMultiple"],
		onSuccess: props.onSuccess,
		onError: props.onError,
	});
};

export default useDeleteSinglePermanently;
