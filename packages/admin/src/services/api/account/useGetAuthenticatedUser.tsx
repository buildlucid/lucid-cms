import { useLocation, useNavigate } from "@solidjs/router";
import { createQuery } from "@tanstack/solid-query";
import type { ResponseBody, UserResponse } from "@types";
import { createEffect, createMemo } from "solid-js";
import userStore from "@/store/userStore";
import getLoginRedirectURL from "@/utils/login-route";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

// biome-ignore lint/suspicious/noEmptyInterface: <explanation>
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

	const query = createQuery(() => ({
		queryKey: ["users.getSingle", queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<UserResponse>>({
				url: "/api/v1/account",
				config: {
					method: "GET",
				},
			}),
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
	}));

	createEffect(() => {
		if (query.isSuccess) {
			userStore.set("user", query.data.data);
		}
		if (query.isError) {
			if (options?.authLayout) {
				return;
			}
			navigate(getLoginRedirectURL(location.search));
		}
	});

	return query;
};

export default useGetAuthenticatedUser;
