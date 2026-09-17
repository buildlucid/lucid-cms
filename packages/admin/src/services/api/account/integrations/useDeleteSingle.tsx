import type { ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	id: number;
}

export const deleteSingleReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/lucid/api/v1/account/integrations/${params.id}`,
		csrf: true,
		method: "DELETE",
	});
};

interface UseDeleteProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useDeleteSingle = (props: UseDeleteProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<null>>({
		mutationFn: deleteSingleReq,
		getSuccessToast: () => ({
			title: T()("toasts.common.deleted.title", {
				name: T()("integrations.singular"),
			}),
			message: T()("toasts.common.deleted.message", {
				name: T()("integrations.singular").toLowerCase(),
			}),
		}),
		invalidates: [queryKeys.integrations.list()],
		onSuccess: props.onSuccess,
		onError: props.onError,
	});
};

export default useDeleteSingle;
