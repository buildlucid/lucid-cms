import type {
	OAuthClientAuthMethod,
	OAuthClientCreateResponse,
	ResponseBody,
} from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface UseCreateSingleProps {
	onSuccess?: (data: ResponseBody<OAuthClientCreateResponse>) => void;
	onError?: () => void;
}

const useCreateSingle = (props?: UseCreateSingleProps) => {
	// ----------------------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<
		{
			name: string;
			clientUri?: string;
			authMethod: OAuthClientAuthMethod;
			redirectUris: string[];
			enabled: boolean;
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
		},
		ResponseBody<OAuthClientCreateResponse>
	>({
		mutationFn: (body) =>
			request<ResponseBody<OAuthClientCreateResponse>>({
				url: "/lucid/api/v1/integrations/oauth-clients",
				csrf: true,
				config: {
					method: "POST",
					body,
				},
			}),
		getSuccessToast: () => ({
			title: T()("oauth.clients.created.title"),
			message: T()("oauth.clients.created.message"),
		}),
		invalidates: ["oauthClients.getAll"],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useCreateSingle;
