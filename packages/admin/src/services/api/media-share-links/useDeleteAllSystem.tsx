import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export const deleteAllSystemReq = () => {
	return request<undefined>({
		url: "/lucid/api/v1/media/share-links",
		csrf: true,
		config: {
			method: "DELETE",
		},
	});
};

interface UseDeleteAllSystemProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useDeleteAllSystem = (props?: UseDeleteAllSystemProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<undefined, undefined>({
		mutationFn: deleteAllSystemReq,
		getSuccessToast: () => ({
			title: T()("toasts.media.share.links.delete.all.system.title"),
			message: T()("toasts.media.share.links.delete.all.system.message"),
		}),
		invalidates: ["mediaShareLinks.getMultiple"],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useDeleteAllSystem;
