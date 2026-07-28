import type { ResponseBody } from "@types";
import type { Accessor } from "solid-js";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	id: number;
}

interface ResponseBodyVal {
	apiKey: string;
}

export const regenerateKeyReq = (userId: number, params: Params) => {
	return request<ResponseBody<ResponseBodyVal>>({
		url: `/lucid/api/v1/users/${userId}/integrations/${params.id}/regenerate-keys`,
		csrf: true,
		config: {
			method: "POST",
		},
	});
};

interface UseGenerateAPIKeyProps {
	onSuccess?: (data: ResponseBody<ResponseBodyVal>) => void;
	onError?: () => void;
}

const bindUseRegenerateAPIKey =
	(userId: Accessor<number>) => (props: UseGenerateAPIKeyProps) => {
		// -----------------------------
		// Mutation
		return serviceHelpers.useMutationWrapper<
			Params,
			ResponseBody<ResponseBodyVal>
		>({
			mutationFn: (params) => regenerateKeyReq(userId(), params),
			getSuccessToast: () => ({
				title: T()("toasts.integrations.api.keys.regenerate.title"),
				message: T()("toasts.integrations.api.keys.regenerate.message"),
			}),
			invalidates: ["integrations.getAll"],
			onSuccess: props.onSuccess,
			onError: props.onError,
		});
	};

export default bindUseRegenerateAPIKey;
