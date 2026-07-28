import type { ResponseBody } from "@types";
import type { Accessor } from "solid-js";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	id: number;
}

export const deleteSingleReq = (userId: number, params: Params) => {
	return request<ResponseBody<null>>({
		url: `/lucid/api/v1/users/${userId}/integrations/${params.id}`,
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

const bindUseDeleteSingle =
	(userId: Accessor<number>) => (props: UseDeleteProps) => {
		// -----------------------------
		// Mutation
		return serviceHelpers.useMutationWrapper<Params, ResponseBody<null>>({
			mutationFn: (params) => deleteSingleReq(userId(), params),
			getSuccessToast: () => ({
				title: T()("toasts.common.deleted.title", {
					name: T()("integrations.singular"),
				}),
				message: T()("toasts.common.deleted.message", {
					name: T()("integrations.singular").toLowerCase(),
				}),
			}),
			invalidates: ["integrations.getAll"],
			onSuccess: props.onSuccess,
			onError: props.onError,
		});
	};

export default bindUseDeleteSingle;
