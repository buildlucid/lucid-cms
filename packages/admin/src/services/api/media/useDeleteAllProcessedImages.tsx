import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { ResponseBody } from "@types";

export const deleteAllProcessedImagesReq = () => {
	return request<ResponseBody<null>>({
		url: "/api/v1/media/processed",
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
			title: T()("delete_processed_images_toast_title"),
			message: T()("delete_processed_images_toast_message"),
		}),
		invalidates: ["settings.getSettings"],
		onSuccess: props.onSuccess,
		onError: props.onError,
	});
};

export default useDeleteAllProcessedImages;
