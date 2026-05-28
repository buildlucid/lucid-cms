import type { ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export const deleteAllProcessedImagesReq = () => {
	return request<ResponseBody<null>>({
		url: "/lucid/api/v1/media/processed",
		csrf: true,
		config: {
			method: "DELETE",
		},
	});
};

interface UseDeleteAllProcessedImagesProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useDeleteAllProcessedImages = (
	props: UseDeleteAllProcessedImagesProps,
) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<unknown, ResponseBody<null>>({
		mutationFn: deleteAllProcessedImagesReq,
		getSuccessToast: () => ({
			title: T()("toasts.common.delete.processed.images.title"),
			message: T()("toasts.common.delete.processed.images.message"),
		}),
		invalidates: ["settings.getSettings"],
		onSuccess: props.onSuccess,
		onError: props.onError,
	});
};

export default useDeleteAllProcessedImages;
