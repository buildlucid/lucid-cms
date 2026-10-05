import type { ErrorResponse, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface Params {
	id: number;
}

export const unapproveReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/lucid/api/v1/releases/${params.id}/unapprove`,
		csrf: true,
		method: "POST",
	});
};

interface UseUnapproveProps {
	onSuccess?: (_response: ResponseBody<null>) => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
}

const useUnapprove = (props?: UseUnapproveProps) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<null>>({
		mutationFn: unapproveReq,
		getSuccessToast: () => ({
			title: T()("toasts.releases.unapproved.title"),
			message: T()("toasts.releases.unapproved.message"),
		}),
		invalidates: [queryKeys.releases.all()],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useUnapprove;
