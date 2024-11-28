import T from "@/translations";
import spawnToast from "@/utils/spawn-toast";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { ResponseBody, RoleResponse } from "@types";

interface Params {
	id: number;
	body: {
		name?: string;
		permissions?: string[];
	};
}

export const updateSingleReq = (params: Params) => {
	return request<ResponseBody<RoleResponse>>({
		url: `/api/v1/roles/${params.id}`,
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
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<RoleResponse>>({
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
