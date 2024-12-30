import T from "@/translations";
import spawnToast from "@/utils/spawn-toast";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { ResponseBody, ClientIntegrationResponse } from "@types";

interface Params {
	id: number;
	body: {
		name?: string;
		description?: string | null;
		enabled?: boolean | null;
	};
}

export const updateSingleReq = (params: Params) => {
	return request<ResponseBody<ClientIntegrationResponse>>({
		url: `/api/v1/client-integrations/${params.id}`,
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
		ResponseBody<ClientIntegrationResponse>
	>({
		mutationFn: updateSingleReq,
		invalidates: ["clientIntegrations.getAll", "clientIntegrations.getSingle"],
		onSuccess: () => {
			spawnToast({
				title: T()("client_integration_update_toast_title"),
				message: T()("client_integration_update_toast_message"),
				status: "success",
			});
			props?.onSuccess?.();
		},
		onError: props?.onError,
	});
};

export default useUpdateSingle;
