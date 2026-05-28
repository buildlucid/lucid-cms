import type { ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	id: number;
}

export const deleteSingleReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/lucid/api/v1/client-integrations/${params.id}`,
		csrf: true,
		config: {
			method: "DELETE",
		},
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
				name: T()("client.integrations.singular"),
			}),
			message: T()("toasts.common.deleted.message", {
				name: T()("client.integrations.singular").toLowerCase(),
			}),
		}),
		invalidates: ["clientIntegrations.getAll"],
		onSuccess: props.onSuccess,
		onError: props.onError,
	});
};

export default useDeleteSingle;
