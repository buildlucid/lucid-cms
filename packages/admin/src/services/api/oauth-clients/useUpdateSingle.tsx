import type { OAuthClient, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	id: number;
	body: {
		name?: string;
		clientUri?: string | null;
		redirectUris?: string[];
		enabled?: boolean;
		logo?: {
			key: string;
			fileName: string;
			width?: number;
			height?: number;
			blurHash?: string;
			averageColor?: string;
			base64?: string | null;
			isDark?: boolean;
			isLight?: boolean;
		};
		removeLogo?: boolean;
	};
}

interface UseUpdateSingleProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useUpdateSingle = (props?: UseUpdateSingleProps) => {
	// ----------------------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<OAuthClient>>({
		mutationFn: (params) =>
			request<ResponseBody<OAuthClient>>({
				url: `/lucid/api/v1/integrations/oauth-clients/${params.id}`,
				csrf: true,
				method: "PATCH",
				body: params.body,
			}),
		getSuccessToast: () => ({
			title: T()("oauth.clients.updated.title"),
			message: T()("oauth.clients.updated.message"),
		}),
		invalidates: [
			queryKeys.oauthClients.list(),
			queryKeys.oauthClients.detail(),
			queryKeys.oauthConnections.list(),
		],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useUpdateSingle;
