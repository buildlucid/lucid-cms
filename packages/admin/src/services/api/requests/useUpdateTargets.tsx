import type { ErrorResponse, ResponseBody } from "@types";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import { requestChangeKeys } from "./change-keys";

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
		invalidates: requestChangeKeys(),
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useUpdateTargets;
