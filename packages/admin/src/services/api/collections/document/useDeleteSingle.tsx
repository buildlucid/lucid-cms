import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { ResponseBody } from "@lucidcms/core/types";

interface Params {
	id: number;
	collectionKey: string;
}

export const deleteSingleReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/api/v1/collections/documents/${params.collectionKey}/${params.id}`,
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
			title: T()("deleted_toast_title", {
				name: props.getCollectionName(),
			}),
			message: T()("deleted_toast_message", {
				name: props.getCollectionName().toLowerCase(),
			}),
		}),
		invalidates: ["collections.document.getMultiple"],
		onSuccess: props.onSuccess,
		onError: props.onError,
	});
};

export default useDeleteSingle;
