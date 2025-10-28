import { createMemo } from "solid-js";
import { createQuery } from "@tanstack/solid-query";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { ResponseBody, ValidateInvitationResponse } from "@types";

interface QueryParams {
	location: {
		token: string;
	};
}

const useValidateInvitation = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	return createQuery(() => ({
		queryKey: ["auth.validateInvitation", queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<ValidateInvitationResponse>>({
				url: `/api/v1/auth/invitation/validate/${queryParams().location?.token}`,
				config: {
					method: "GET",
				},
			}),
		retry: 0,
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
		get refetchOnWindowFocus() {
			return params.refetchOnWindowFocus ?? false;
		},
	}));
};

export default useValidateInvitation;
