import type { ErrorResponse, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface Params {
	collectionKey: string;
	id: number;
	body?: {
		/** Opens a create request with the copy instead, which collections that review new documents require. */
		request?: { title: string };
	};
}

type Response = ResponseBody<{
	id: number;
	/** The create request holding the copy, when one was opened. */
	requestId: number | null;
}>;

export const duplicateSingleReq = (params: Params) => {
	return request<Response>({
		url: `/api/v1/documents/${params.collectionKey}/${params.id}/duplicate`,
		csrf: true,
		method: "POST",
		body: params.body ?? {},
	});
};

interface UseDuplicateSingleProps {
	onSuccess?: (_data: Response) => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
	getCollectionName: () => string;
}

const useDuplicateSingle = (props: UseDuplicateSingleProps) => {
	return serviceHelpers.useMutationWrapper<Params, Response>({
		mutationFn: duplicateSingleReq,
		getSuccessToast: (data) =>
			data.data.requestId === null
				? {
						title: T()("toasts.documents.duplicate.title", {
							name: props.getCollectionName(),
						}),
						message: T()("toasts.documents.duplicate.message", {
							name: props.getCollectionName().toLowerCase(),
						}),
					}
				: {
						title: T()("toasts.documents.duplicate.request.title"),
						message: T()("toasts.documents.duplicate.request.message", {
							name: props.getCollectionName().toLowerCase(),
						}),
					},
		invalidates: [queryKeys.documents.all(), queryKeys.requests.all()],
		onSuccess: props.onSuccess,
		onError: props.onError,
	});
};

export default useDuplicateSingle;
