import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	mediaId: number;
}

export const deleteAllForMediaReq = (params: Params) => {
	return request<undefined>({
		url: `/lucid/api/v1/media/${params.mediaId}/share-links`,
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
			title: T()("toasts.media.share.links.delete.all.title"),
			message: T()("toasts.media.share.links.delete.all.message"),
		}),
		invalidates: ["mediaShareLinks.getMultiple"],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useDeleteAllForMedia;
