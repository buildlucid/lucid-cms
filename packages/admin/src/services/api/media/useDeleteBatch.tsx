import { queryKeys } from "@/services/query-keys";
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
		url: "/lucid/api/v1/media/batch",
		csrf: true,
		method: "DELETE",
		body: params.body,
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
			title: T()("toasts.media.batch.deleted.title"),
			message: T()("toasts.media.batch.deleted.message"),
		}),
		invalidates: [
			queryKeys.media.lists(),
			queryKeys.mediaFolders.list(),
			queryKeys.mediaFolders.hierarchy(),
		],
		onSuccess: props.onSuccess,
		onError: props.onError,
	});
};

export default useDeleteBatch;
