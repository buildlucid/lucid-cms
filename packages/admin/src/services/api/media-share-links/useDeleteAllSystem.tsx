import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export const deleteAllSystemReq = () => {
	return request<undefined>({
		url: "/api/v1/media/share-links",
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
			title: T()("media_share_links_delete_all_system_toast_title"),
			message: T()("media_share_links_delete_all_system_toast_message"),
		}),
		invalidates: ["mediaShareLinks.getMultiple"],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useDeleteAllSystem;
