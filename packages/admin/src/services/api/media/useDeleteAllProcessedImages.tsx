import type { ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export const deleteAllProcessedImagesReq = () => {
	return request<ResponseBody<null>>({
		url: "/lucid/api/v1/media/processed",
		csrf: true,
		method: "DELETE",
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
		invalidates: [queryKeys.settings.detail()],
		onSuccess: props.onSuccess,
		onError: props.onError,
	});
};

export default useDeleteAllProcessedImages;
