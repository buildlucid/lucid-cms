import type { ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface Params {
	ids?: number[];
	/** Every notification in the inbox. */
	all?: boolean;
	read?: boolean;
	archived?: boolean;
}

export const updateMultipleReq = (params: Params) => {
	return request<ResponseBody<undefined>>({
		url: "/lucid/api/v1/notifications",
		csrf: true,
		method: "PATCH",
		body: params,
	});
};

interface UseUpdateMultipleProps {
	onSuccess?: () => void;
	onError?: () => void;
}

/** Marks notifications read, unread, archived or unarchived. Quiet on success, as the list shows the change. */
const useUpdateMultiple = (props?: UseUpdateMultipleProps) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<undefined>>({
		mutationFn: updateMultipleReq,
		invalidates: [
			queryKeys.notifications.list(),
			queryKeys.notifications.summary(),
		],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useUpdateMultiple;
