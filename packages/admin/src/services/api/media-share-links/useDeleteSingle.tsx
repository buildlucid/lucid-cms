import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	mediaId: number;
	linkId: number;
}

export const deleteSingleReq = (params: Params) => {
	return request<undefined>({
		url: `/api/v1/media/${params.mediaId}/share-links/${params.linkId}`,
		csrf: true,
		config: {
			method: "DELETE",
		},
	});
};

interface UseDeleteSingleProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useDeleteSingle = (props?: UseDeleteSingleProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, undefined>({
		mutationFn: deleteSingleReq,
		getSuccessToast: () => ({
			title: T()("media_share_link_delete_toast_title"),
			message: T()("media_share_link_delete_toast_message"),
		}),
		invalidates: ["mediaShareLinks.getMultiple"],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useDeleteSingle;
