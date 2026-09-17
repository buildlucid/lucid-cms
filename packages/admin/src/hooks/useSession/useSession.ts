import { useQuery } from "@tanstack/solid-query";
import { createEffect } from "solid-js";
import { queries } from "@/services/queries";
import userStore from "@/store/userStore/userStore";
import { LucidError } from "@/utils/error-handling";

/**
 * Returns the current user and sign-in status without redirecting.
 *
 * @example
 * ```tsx
 * import { useSession } from "@lucidcms/admin/hooks";
 *
 * const session = useSession();
 *
 * return (
 *   <p>
 *     {session.status() === "authenticated" ? "Signed in" : "Not signed in"}
 *   </p>
 * );
 * ```
 */
export const useSession = () => {
	const query = useQuery(queries.account.session);

	createEffect(() => {
		if (query.isSuccess) userStore.set("user", query.data.data);
		else if (
			query.error instanceof LucidError &&
			query.error.errorRes.status === 401
		)
			userStore.get.reset();
	});

	return {
		user: () => (query.isSuccess ? query.data.data : null),
		status: () =>
			query.isPending
				? ("loading" as const)
				: query.isSuccess
					? ("authenticated" as const)
					: query.error instanceof LucidError &&
							query.error.errorRes.status === 401
						? ("anonymous" as const)
						: ("error" as const),
		error: () => query.error,
	};
};
