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

export const deleteMultiplePermanentlyReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/lucid/api/v1/documents/${params.collectionKey}/permanent`,
		csrf: true,
		config: {
			method: "DELETE",
			body: params.body,
		},
	});
};

interface UseDeleteMultiplePermanentlyProps {
	onSuccess?: () => void;
	onError?: () => void;
	getCollectionName: () => string;
}

const useDeleteMultiplePermanently = (
	props: UseDeleteMultiplePermanentlyProps,
) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<null>>({
		mutationFn: deleteMultiplePermanentlyReq,
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

export default useDeleteMultiplePermanently;
