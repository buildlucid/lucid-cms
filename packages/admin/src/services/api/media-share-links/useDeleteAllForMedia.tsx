import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	mediaId: number;
}

export const deleteAllForMediaReq = (params: Params) => {
	return request<undefined>({
		url: `/api/v1/media/${params.mediaId}/share-links`,
		csrf: true,
		config: {
			method: "DELETE",
		},
	});
};

interface UseDeleteAllForMediaProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useDeleteAllForMedia = (props?: UseDeleteAllForMediaProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, undefined>({
		mutationFn: deleteAllForMediaReq,
		getSuccessToast: () => ({
			title: T()("media_share_links_delete_all_toast_title"),
			message: T()("media_share_links_delete_all_toast_message"),
		}),
		invalidates: ["mediaShareLinks.getMultiple"],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useDeleteAllForMedia;
