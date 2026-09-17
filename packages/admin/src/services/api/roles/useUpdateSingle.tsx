import type { ResponseBody, Role } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import spawnToast from "@/utils/spawn-toast";

interface Params {
	id: number;
	body: {
		name?: string;
		description?: string | null;
		permissions?: string[];
	};
}

export const updateSingleReq = (params: Params) => {
	return request<ResponseBody<Role>>({
		url: `/lucid/api/v1/roles/${params.id}`,
		csrf: true,
		method: "PATCH",
		body: params.body,
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
		invalidates: [
			queryKeys.roles.list(),
			queryKeys.roles.detail(),
			queryKeys.users.detail(),
		],
		onSuccess: () => {
			spawnToast({
				title: T()("toasts.roles.update.title"),
				message: T()("toasts.roles.update.message", {
					name: T()("common.role"),
				}),
				status: "success",
			});
			props?.onSuccess?.();
		},
		onError: props?.onError,
	});
};

export default useUpdateSingle;
