import type { ResponseBody } from "@types";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { OAuthConnectionOwner } from "./types";
import { getOAuthConnectionsPath } from "./types";

type Params = {
	owner: OAuthConnectionOwner;
	id: number;
};

const useRevokeConnection = (props?: { onSuccess?: () => void }) =>
	serviceHelpers.useMutationWrapper<Params, ResponseBody<null>>({
		mutationFn: (params) =>
			request<ResponseBody<null>>({
				url: `${getOAuthConnectionsPath(params.owner)}/${params.id}`,
				csrf: true,
				config: {
					method: "DELETE",
				},
			}),
		invalidates: ["oauthConnections.getAll"],
		onSuccess: props?.onSuccess,
	});

export default useRevokeConnection;
