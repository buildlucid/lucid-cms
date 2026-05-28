import type { ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	collectionKey: string;
	body: {
		ids: number[];
	};
}

export const deleteMultipleReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/lucid/api/v1/documents/${params.collectionKey}`,
		csrf: true,
		config: {
			method: "DELETE",
			body: params.body,
		},
	});
};

interface UseDeleteMultipleProps {
	onSuccess?: () => void;
	onError?: () => void;
	getCollectionName: () => string;
}

const useDeleteMultiple = (props: UseDeleteMultipleProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<null>>({
		mutationFn: deleteMultipleReq,
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

export default useDeleteMultiple;
