import type {
	ErrorResponse,
	InternalDocumentField,
	ResponseBody,
} from "@types";
import { requestChangeKeys } from "@/services/api/requests/change-keys";
import { queryKeys } from "@/services/query-keys";
import type { BrickData } from "@/store/brickStore/brickStore";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface Params {
	collectionKey: string;
	body: {
		title: string;
		bricks: Array<BrickData>;
		fields: Array<InternalDocumentField>;
	};
}

type Response = ResponseBody<{ id: number; requestId: number }>;

export const requestSingleReq = (params: Params) => {
	return request<Response>({
		url: `/api/v1/documents/${params.collectionKey}/request`,
		csrf: true,
		method: "POST",
		body: params.body,
	});
};

interface UseRequestSingleProps {
	onSuccess?: (_data: Response) => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
	getCollectionName: () => string;
}

const useRequestSingle = (props: UseRequestSingleProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, Response>({
		mutationFn: requestSingleReq,
		getSuccessToast: () => {
			return {
				title: T()("toasts.document.request.title", {
					name: props.getCollectionName(),
				}),
				message: T()("toasts.document.request.message"),
			};
		},
		invalidates: [queryKeys.documents.all(), ...requestChangeKeys()],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useRequestSingle;
