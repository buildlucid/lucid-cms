import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	collectionKey: string;
	documentId: number;
}

export const revokePreviewsReq = (params: Params) => {
	return request<undefined>({
		url: `/api/v1/documents/${params.collectionKey}/${params.documentId}/preview`,
		csrf: true,
		method: "DELETE",
	});
};

/** Ends every preview of a document, so its preview links stop working. */
const useRevokePreviews = (props?: { onSuccess?: () => void }) => {
	return serviceHelpers.useMutationWrapper<Params, undefined>({
		mutationFn: revokePreviewsReq,
		getSuccessToast: () => ({
			title: T()("toasts.preview.links.revoked.title"),
			message: T()("toasts.preview.links.revoked.message"),
		}),
		onSuccess: props?.onSuccess,
	});
};

export default useRevokePreviews;
