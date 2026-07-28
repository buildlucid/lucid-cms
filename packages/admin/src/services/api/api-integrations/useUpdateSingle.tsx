import type { ApiIntegration, ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import spawnToast from "@/utils/spawn-toast";

interface Params {
	id: number;
	body: {
		name?: string;
		description?: string | null;
		enabled?: boolean | null;
		scopes?: string[];
	};
}

export const updateSingleReq = (params: Params) => {
	return request<ResponseBody<ApiIntegration>>({
		url: `/lucid/api/v1/integrations/api/${params.id}`,
		csrf: true,
		config: {
			method: "PATCH",
			body: params.body,
		},
	});
};

interface UseUpdateSingleProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useUpdateSingle = (props?: UseUpdateSingleProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<ApiIntegration>
	>({
		mutationFn: updateSingleReq,
		invalidates: ["apiIntegrations.getAll", "apiIntegrations.getSingle"],
		onSuccess: () => {
			spawnToast({
				title: T()("toasts.client.integrations.update.title"),
				message: T()("toasts.client.integrations.update.message"),
				status: "success",
			});
			props?.onSuccess?.();
		},
		onError: props?.onError,
	});
};

export default useUpdateSingle;
