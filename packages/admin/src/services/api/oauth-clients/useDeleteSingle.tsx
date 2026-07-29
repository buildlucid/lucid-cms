import type { ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	id: number;
}

interface UseDeleteSingleProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useDeleteSingle = (props?: UseDeleteSingleProps) => {
	// ----------------------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<null>>({
		mutationFn: (params) =>
			request<ResponseBody<null>>({
				url: `/lucid/api/v1/integrations/oauth-clients/${params.id}`,
				csrf: true,
				config: {
					method: "DELETE",
				},
			}),
		getSuccessToast: () => ({
			title: T()("oauth.clients.deleted.title"),
			message: T()("oauth.clients.deleted.message"),
		}),
		invalidates: ["oauthClients.getAll", "oauthConnections.getAll"],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useDeleteSingle;
