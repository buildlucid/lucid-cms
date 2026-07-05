import type { ErrorResponse, ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface Params {
	id: number;
	collectionKey: string;
	body: {
		previousDocumentId: number | null;
		nextDocumentId: number | null;
	};
}

export const updateOrderReq = (params: Params) => {
	return request<ResponseBody<undefined>>({
		url: `/lucid/api/v1/documents/${params.collectionKey}/${params.id}/order`,
		csrf: true,
		config: {
			method: "PATCH",
			body: params.body,
		},
	});
};

interface UseUpdateOrderProps {
	onSuccess?: () => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
	silent?: boolean;
}

const useUpdateOrder = (props?: UseUpdateOrderProps) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<undefined>>({
		mutationFn: updateOrderReq,
		getSuccessToast: props?.silent
			? undefined
			: () => ({
					title: T()("toasts.documents.order.updated.title"),
					message: T()("toasts.documents.order.updated.message"),
				}),
		invalidates: ["documents.getMultiple"],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useUpdateOrder;
