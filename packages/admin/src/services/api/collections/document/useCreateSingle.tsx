import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { BrickData } from "@/store/brickStore";
import type {
	ResponseBody,
	ErrorResponse,
	FieldResponse,
} from "@lucidcms/core/types";

interface Params {
	collectionKey: string;
	body: {
		publish: boolean;
		bricks: Array<BrickData>;
		fields: Array<FieldResponse>;
	};
}

export const createSingleReq = (params: Params) => {
	return request<
		ResponseBody<{
			id: number;
		}>
	>({
		url: `/api/v1/collections/documents/${params.collectionKey}`,
		csrf: true,
		config: {
			method: "POST",
			body: params.body,
		},
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
				title: T()("create_toast_title", {
					name: props.getCollectionName(),
				}),
				message: T()("create_toast_message", {
					name: props.getCollectionName().toLowerCase(),
				}),
			};
		},
		invalidates: [
			"collections.document.getMultiple",
			"collections.document.getSingle",
		],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useCreateSingle;
