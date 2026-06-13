import { useLocation, useNavigate } from "@solidjs/router";
import { useQuery } from "@tanstack/solid-query";
import type { ResponseBody, User } from "@types";
import { createEffect, createMemo } from "solid-js";
import tenantStore from "@/store/tenantStore";
import userStore from "@/store/userStore";
import type { QueryHook } from "@/types/utils";
import getLoginRedirectURL from "@/utils/login-route";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

// biome-ignore lint/suspicious/noEmptyInterface: explanation
interface QueryParams {}

const useGetAuthenticatedUser = (
	params: QueryHook<QueryParams>,
	options?: {
		authLayout?: boolean;
	},
) => {
	const navigate = useNavigate();
	const location = useLocation();
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	const query = useQuery(() => ({
		queryKey: ["users.getSingle", queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<User>>({
				url: "/lucid/api/v1/account",
				config: {
					method: "GET",
					tenant: false,
				},
			}),
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
	}));

	createEffect(() => {
		if (query.isSuccess) {
			userStore.set("user", query.data.data);
			tenantStore.get.syncTenants(query.data.data.tenants ?? []);
		}
		if (query.isError) {
			if (options?.authLayout) {
				return;
			}
			navigate(getLoginRedirectURL(location.search), {
				replace: true,
			});
		}
	});

	return query;
};

export default useGetAuthenticatedUser;
