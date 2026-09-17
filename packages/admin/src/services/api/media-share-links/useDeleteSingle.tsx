import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	mediaId: number;
	linkId: number;
}

export const deleteSingleReq = (params: Params) => {
	return request<undefined>({
		url: `/lucid/api/v1/media/${params.mediaId}/share-links/${params.linkId}`,
		csrf: true,
		method: "DELETE",
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
			title: T()("toasts.media.share.link.delete.title"),
			message: T()("toasts.media.share.link.delete.message"),
		}),
		invalidates: [queryKeys.mediaShareLinks.list()],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useDeleteSingle;
