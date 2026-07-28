import type { Integration, IntegrationExpiry, ResponseBody } from "@types";
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
		expiry?: IntegrationExpiry;
		scopes?: string[];
	};
}

export const updateSingleReq = (params: Params) => {
	return request<ResponseBody<Integration>>({
		url: `/lucid/api/v1/account/integrations/${params.id}`,
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
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<Integration>>({
		mutationFn: updateSingleReq,
		invalidates: ["integrations.getAll", "integrations.getSingle"],
		onSuccess: () => {
			spawnToast({
				title: T()("toasts.integrations.update.title"),
				message: T()("toasts.integrations.update.message"),
				status: "success",
			});
			props?.onSuccess?.();
		},
		onError: props?.onError,
	});
};

export default useUpdateSingle;
