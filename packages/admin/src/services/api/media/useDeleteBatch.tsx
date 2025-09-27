import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	body: {
		folderIds: Array<number>;
		mediaIds: Array<number>;
		recursiveMedia: boolean;
	};
}

export const deleteBatchReq = (params: Params) => {
	return request<undefined>({
		url: "/api/v1/media/batch",
		csrf: true,
		config: {
			method: "DELETE",
			body: params.body,
		},
	});
};

interface UseDeleteBatchProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useDeleteBatch = (props: UseDeleteBatchProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, undefined>({
		mutationFn: deleteBatchReq,
		getSuccessToast: () => ({
			title: T()("media_batch_deleted_toast_title"),
			message: T()("media_batch_deleted_toast_message"),
		}),
		invalidates: [
			"media.getMultiple",
			"mediaFolders.getMultiple",
			"mediaFolders.getHierarchy",
		],
		onSuccess: props.onSuccess,
		onError: props.onError,
	});
};

export default useDeleteBatch;
