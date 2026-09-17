import type {
	ErrorResponse,
	InternalDocumentField,
	ResponseBody,
} from "@types";
import { queryKeys } from "@/services/query-keys";
import type { BrickData } from "@/store/brickStore/brickStore";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface Params {
	collectionKey: string;
	body: {
		bricks: Array<BrickData>;
		fields: Array<InternalDocumentField>;
	};
}

export const createSingleReq = (params: Params) => {
	return request<
		ResponseBody<{
			id: number;
		}>
	>({
		url: `/lucid/api/v1/documents/${params.collectionKey}`,
		csrf: true,
		method: "POST",
		body: params.body,
	});
};

interface UseCreateSingleProps {
	onSuccess?: (
		_data: ResponseBody<{
			id: number;
		}>,
	) => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
	getCollectionName: () => string;
}

const useCreateSingle = (props: UseCreateSingleProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<{
			id: number;
		}>
	>({
		mutationFn: createSingleReq,
		getSuccessToast: () => {
			return {
				title: T()("toasts.common.create.title", {
					name: props.getCollectionName(),
				}),
				message: T()("toasts.common.create.message", {
					name: props.getCollectionName().toLowerCase(),
				}),
			};
		},
		invalidates: [queryKeys.documents.all()],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useCreateSingle;
