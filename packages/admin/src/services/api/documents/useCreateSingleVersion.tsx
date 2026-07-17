import type {
	ErrorResponse,
	InternalDocumentField,
	ResponseBody,
} from "@types";
import type { BrickData } from "@/store/brick-store";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface Params {
	collectionKey: string;
	documentId: number;
	body: {
		bricks?: Array<BrickData>;
		fields?: Array<InternalDocumentField>;
	};
}

export const createSingleVersionReq = (params: Params) => {
	return request<
		ResponseBody<{
			id: number;
		}>
	>({
		url: `/lucid/api/v1/documents/${params.collectionKey}/${params.documentId}`,
		csrf: true,
		config: {
			method: "POST",
			body: params.body,
		},
	});
};

interface UseCreateSingleVersionProps {
	onSuccess?: (
		_data: ResponseBody<{
			id: number;
		}>,
	) => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
	getCollectionName: () => string;
}

const useCreateSingleVersion = (props: UseCreateSingleVersionProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<{
			id: number;
		}>
	>({
		mutationFn: createSingleVersionReq,
		getSuccessToast: () => {
			return {
				title: T()("toasts.common.update.title", {
					name: props.getCollectionName(),
				}),
				message: T()("toasts.common.update.message", {
					name: props.getCollectionName().toLowerCase(),
				}),
			};
		},
		invalidates: ["documents.getMultiple", "documents.getSingle"],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useCreateSingleVersion;
