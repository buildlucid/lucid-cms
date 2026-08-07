import type { ErrorResponse, ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface Params {
	collectionKey: string;
	id: number;
}

export const duplicateSingleReq = (params: Params) => {
	return request<
		ResponseBody<{
			id: number;
		}>
	>({
		url: `/lucid/api/v1/documents/${params.collectionKey}/${params.id}/duplicate`,
		csrf: true,
		config: {
			method: "POST",
		},
	});
};

interface UseDuplicateSingleProps {
	onSuccess?: (
		_data: ResponseBody<{
			id: number;
		}>,
	) => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
	getCollectionName: () => string;
}

const useDuplicateSingle = (props: UseDuplicateSingleProps) => {
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<{
			id: number;
		}>
	>({
		mutationFn: duplicateSingleReq,
		getSuccessToast: () => ({
			title: T()("toasts.documents.duplicate.title", {
				name: props.getCollectionName(),
			}),
			message: T()("toasts.documents.duplicate.message", {
				name: props.getCollectionName().toLowerCase(),
			}),
		}),
		invalidates: ["documents.getMultiple", "documents.getSingle"],
		onSuccess: props.onSuccess,
		onError: props.onError,
	});
};

export default useDuplicateSingle;
