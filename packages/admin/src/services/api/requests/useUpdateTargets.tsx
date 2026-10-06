import type { ErrorResponse, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface Params {
	id: number;
	requestDocumentId: number;
	body: { targets: string[] };
}

export const updateTargetsReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/lucid/api/v1/requests/${params.id}/documents/${params.requestDocumentId}/targets`,
		csrf: true,
		method: "PATCH",
		body: params.body,
	});
};

interface UseUpdateTargetsProps {
	onSuccess?: (_response: ResponseBody<null>) => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
}

const useUpdateTargets = (props?: UseUpdateTargetsProps) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<null>>({
		mutationFn: updateTargetsReq,
		invalidates: [queryKeys.requests.all()],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useUpdateTargets;
