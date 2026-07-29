import type { OAuthClientRegenerateSecretResponse, ResponseBody } from "@types";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	id: number;
}

interface UseRegenerateSecretProps {
	onSuccess?: (data: ResponseBody<OAuthClientRegenerateSecretResponse>) => void;
	onError?: () => void;
}

const useRegenerateSecret = (props?: UseRegenerateSecretProps) => {
	// ----------------------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<OAuthClientRegenerateSecretResponse>
	>({
		mutationFn: (params) =>
			request<ResponseBody<OAuthClientRegenerateSecretResponse>>({
				url: `/lucid/api/v1/integrations/oauth-clients/${params.id}/regenerate-secret`,
				csrf: true,
				config: {
					method: "POST",
				},
			}),
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useRegenerateSecret;
