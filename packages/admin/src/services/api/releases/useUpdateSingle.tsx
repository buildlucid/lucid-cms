import type { RichTextJSON } from "@lucidcms/rich-text";
import type { ErrorResponse, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface Params {
	id: number;
	body: {
		title?: string;
		description?: RichTextJSON | null;
		reviewerIds?: number[];
		scheduledAt?: string | null;
		scheduledTimezone?: string | null;
	};
}

export const updateSingleReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/lucid/api/v1/releases/${params.id}`,
		csrf: true,
		method: "PATCH",
		body: params.body,
	});
};

interface UseUpdateSingleProps {
	onSuccess?: (_response: ResponseBody<null>) => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
}

const useUpdateSingle = (props?: UseUpdateSingleProps) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<null>>({
		mutationFn: updateSingleReq,
		invalidates: [queryKeys.releases.all()],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useUpdateSingle;
