import type { OAuthConnection, ResponseBody } from "@types";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { OAuthConnectionOwner } from "./types";
import { getOAuthConnectionsPath } from "./types";

type Params = {
	owner: OAuthConnectionOwner;
	id: number;
	name: string;
};

const useUpdateConnection = (props?: { onSuccess?: () => void }) =>
	serviceHelpers.useMutationWrapper<Params, ResponseBody<OAuthConnection>>({
		mutationFn: (params) =>
			request<ResponseBody<OAuthConnection>>({
				url: `${getOAuthConnectionsPath(params.owner)}/${params.id}`,
				csrf: true,
				config: {
					method: "PATCH",
					body: { name: params.name },
				},
			}),
		invalidates: ["oauthConnections.getAll"],
		onSuccess: props?.onSuccess,
	});

export default useUpdateConnection;
