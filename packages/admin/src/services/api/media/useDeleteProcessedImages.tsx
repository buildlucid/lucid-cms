import type { ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	id: number;
}

export const deleteProcessedImagesReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/lucid/api/v1/media/${params.id}/processed`,
		csrf: true,
		config: {
			method: "DELETE",
		},
	});
};

interface UseDeleteProcessedImagesProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useDeleteProcessedImages = (props: UseDeleteProcessedImagesProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<null>>({
		mutationFn: deleteProcessedImagesReq,
		getSuccessToast: () => ({
			title: T()("toasts.common.delete.processed.images.title"),
			message: T()("toasts.common.delete.processed.images.message"),
		}),
		invalidates: ["settings.getSettings"],
		onSuccess: props.onSuccess,
		onError: props.onError,
	});
};

export default useDeleteProcessedImages;
