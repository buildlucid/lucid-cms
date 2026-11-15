import type { ErrorResponse, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface Params {
	id: number;
	collectionKey: string;
	versionId: number;
	body?: {
		/** Proposes the revision in a new update request instead of restoring it to latest. */
		request?: { title: string };
	};
}

type Response = ResponseBody<{ requestId: number | null }>;

export const restoreRevisionReq = (params: Params) => {
	return request<Response>({
		url: `/api/v1/documents/${params.collectionKey}/${params.id}/${params.versionId}/restore-revision`,
		csrf: true,
		method: "POST",
		body: params.body ?? {},
	});
};

interface UseRestoreRevisionProps {
	onSuccess?: (_data: Response) => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
	getCollectionName: () => string;
}

const useRestoreRevision = (props: UseRestoreRevisionProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, Response>({
		mutationFn: restoreRevisionReq,
		getSuccessToast: (response) =>
			response.data.requestId === null
				? {
						title: T()("toasts.common.restore.revision.title", {
							name: props.getCollectionName(),
						}),
						message: T()("toasts.common.restore.revision.message", {
							name: props.getCollectionName().toLowerCase(),
						}),
					}
				: {
						title: T()("toasts.document.propose.title"),
						message: T()("toasts.document.propose.restore.message"),
					},
		invalidates: [queryKeys.documents.all(), queryKeys.requests.all()],
		onSuccess: props.onSuccess,
		onError: props.onError,
	});
};

export default useRestoreRevision;
