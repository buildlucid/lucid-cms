import type { RichTextJSON } from "@lucidcms/rich-text";
import type { ErrorResponse, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface Params {
	id: number;
	body: {
		body?: RichTextJSON;
		revision: number;
		expectedTargets: Record<string, Record<string, number | null>>;
	};
}

export const approveReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/lucid/api/v1/releases/${params.id}/approve`,
		csrf: true,
		method: "POST",
		body: params.body,
	});
};

interface UseApproveProps {
	onSuccess?: (_response: ResponseBody<null>) => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
}

const useApprove = (props?: UseApproveProps) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<null>>({
		mutationFn: approveReq,
		getSuccessToast: () => ({
			title: T()("toasts.releases.approved.title"),
			message: T()("toasts.releases.approved.message"),
		}),
		invalidates: [queryKeys.releases.all()],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useApprove;
