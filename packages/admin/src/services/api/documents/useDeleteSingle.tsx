import type { ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	id: number;
	collectionKey: string;
}

export const deleteSingleReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/lucid/api/v1/documents/${params.collectionKey}/${params.id}`,
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

const useDeleteSingle = (props: UseDeleteProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<null>>({
		mutationFn: deleteSingleReq,
		getSuccessToast: () => ({
			title: T()("toasts.common.deleted.title", {
				name: props.getCollectionName(),
			}),
			message: T()("toasts.common.deleted.message", {
				name: props.getCollectionName().toLowerCase(),
			}),
		}),
		invalidates: ["documents.getMultiple"],
		onSuccess: props.onSuccess,
		onError: props.onError,
	});
};

export default useDeleteSingle;
