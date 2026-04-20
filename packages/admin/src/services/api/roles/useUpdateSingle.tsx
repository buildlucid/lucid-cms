import type { ResponseBody, Role } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import spawnToast from "@/utils/spawn-toast";

interface Params {
	id: number;
	body: {
		name?: string;
		permissions?: string[];
	};
}

export const updateSingleReq = (params: Params) => {
	return request<ResponseBody<Role>>({
		url: `/lucid/api/v1/roles/${params.id}`,
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
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<Role>>({
		mutationFn: updateSingleReq,
		invalidates: ["roles.getMultiple", "roles.getSingle", "users.getSingle"],
		onSuccess: () => {
			spawnToast({
				title: T()("role_update_toast_title"),
				message: T()("role_update_toast_message", {
					name: T()("role"),
				}),
				status: "success",
			});
			props?.onSuccess?.();
		},
		onError: props?.onError,
	});
};

export default useUpdateSingle;
