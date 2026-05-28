import type { ErrorResponse, ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface Params {
	id: number;
	collectionKey: string;
	versionId: number;
}

export const restoreRevisionReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/lucid/api/v1/documents/${params.collectionKey}/${params.id}/${params.versionId}/restore-revision`,
		csrf: true,
		config: {
			method: "POST",
		},
	});
};

interface UsePromoteSingleProps {
	onSuccess?: () => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
	getCollectionName: () => string;
}

const useRestoreRevision = (props: UsePromoteSingleProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<null>>({
		mutationFn: restoreRevisionReq,
		getSuccessToast: () => ({
			title: T()("toasts.common.restore.revision.title", {
				name: props.getCollectionName(),
			}),
			message: T()("toasts.common.restore.revision.message", {
				name: props.getCollectionName().toLowerCase(),
			}),
		}),
		invalidates: ["documents.getMultiple", "documents.getSingle"],
		onSuccess: props.onSuccess,
		onError: props.onError,
	});
};

export default useRestoreRevision;
