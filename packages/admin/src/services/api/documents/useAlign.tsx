import type { ErrorResponse, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface Params {
	collectionKey: string;
	documentId: number;
	versionId: number;
	body: {
		source: string;
		sourceContentId: string;
		destinationContentId: string;
	};
}

const useAlign = (props?: {
	onSuccess?: () => void;
	onError?: (errors: ErrorResponse | undefined) => void;
}) =>
	serviceHelpers.useMutationWrapper<Params, ResponseBody<null>>({
		mutationFn: (params) =>
			request({
				url: `/lucid/api/v1/documents/${encodeURIComponent(params.collectionKey)}/${params.documentId}/${params.versionId}/align`,
				method: "POST",
				csrf: true,
				body: params.body,
			}),
		getSuccessToast: () => ({
			title: T()("documents.align.success"),
			message: T()("documents.align.success.message"),
		}),
		invalidates: [queryKeys.documents.all(), queryKeys.requests.all()],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
export default useAlign;
