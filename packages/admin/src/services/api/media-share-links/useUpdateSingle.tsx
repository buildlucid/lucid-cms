import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	mediaId: number;
	linkId: number;
	body: {
		name?: string | null;
		description?: string | null;
		password?: string | null;
		expiresAt?: string | null;
	};
}

export const updateSingleReq = (params: Params) => {
	return request<undefined>({
		url: `/lucid/api/v1/media/${params.mediaId}/share-links/${params.linkId}`,
		csrf: true,
		config: {
			method: "PATCH",
			body: params.body,
		},
	});
};

interface UseUpdateSingleProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useUpdateSingle = (props?: UseUpdateSingleProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, undefined>({
		mutationFn: updateSingleReq,
		getSuccessToast: () => ({
			title: T()("toasts.media.share.link.update.title"),
			message: T()("toasts.media.share.link.update.message"),
		}),
		invalidates: ["mediaShareLinks.getMultiple"],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useUpdateSingle;
