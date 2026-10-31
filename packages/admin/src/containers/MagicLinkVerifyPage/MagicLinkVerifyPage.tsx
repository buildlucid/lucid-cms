import { useLocation, useNavigate } from "@solidjs/router";
import { TbOutlineMailX } from "solid-icons/tb";
import {
	type Component,
	createEffect,
	createMemo,
	Match,
	Switch,
} from "solid-js";
import AuthSkeleton from "@/components/AuthSkeleton/AuthSkeleton";
import Button from "@/components/Button/Button";
import ErrorState from "@/components/ErrorState/ErrorState";
import Link from "@/components/Link/Link";
import ThemeLogoIcon from "@/components/ThemeLogoIcon/ThemeLogoIcon";
import { usePageTitle } from "@/hooks/usePageTitle/usePageTitle";
import api from "@/services/api";
import T from "@/translations";

/**
 * Where emailed login links land. Logging in waits for a button press, as email
 * scanners open links before people do and would otherwise use them up.
 */
const MagicLinkVerifyPage: Component = () => {
	// ----------------------------------------
	// State & Hooks
	usePageTitle(() => T()("routes.auth.magic.link.verify.title"));
	const location = useLocation();
	const navigate = useNavigate();

	// ----------------------------------------
	// Memos
	const token = createMemo(() =>
		new URLSearchParams(location.search).get("token"),
	);
	//* keeps the return path, without the spent token, for requesting a new code
	const retrySearch = createMemo(() => {
		const params = new URLSearchParams(location.search);
		params.delete("token");
		return params.size > 0 ? `?${params.toString()}` : "";
	});

	// ----------------------------------------
	// Queries & Mutations
	const validateMagicLink = api.auth.useValidateMagicLink({
		queryParams: {
			location: {
				token: token() as string,
			},
		},
		enabled: () => token() !== null,
	});
	const login = api.auth.useMagicLinkLogin({
		//* a link that stopped working shows the expired state
		onError: () => {
			void validateMagicLink.refetch();
		},
	});

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (!token()) navigate("/admin/login", { replace: true });
	});

	// ----------------------------------------
	// Render
	return (
		<Switch>
			<Match when={validateMagicLink.isLoading}>
				<AuthSkeleton fields={0} />
			</Match>
			<Match when={validateMagicLink.isError}>
				<ErrorState
					icon={<TbOutlineMailX />}
					title={T()("auth.magic.link.invalid.title")}
					description={T()("auth.magic.link.invalid.description")}
					actions={
						<Link
							variant="primary"
							size="sm"
							href={`/admin/magic-link${retrySearch()}`}
						>
							{T()("auth.magic.link.request.new.action")}
						</Link>
					}
				/>
			</Match>
			<Match when={validateMagicLink.data?.data}>
				{(magicLink) => (
					<>
						<ThemeLogoIcon class="h-8 mx-auto mb-6" />
						<h1 class="mb-1 text-center">
							{T()("routes.auth.magic.link.verify.title")}
						</h1>
						<p class="text-center max-w-sm mx-auto">
							{T()("routes.auth.magic.link.verify.description")}{" "}
							<span class="font-medium text-subtitle break-words">
								{magicLink().email}
							</span>
							.
						</p>
						<div class="my-10">
							<Button
								type="button"
								size="lg"
								class="w-full"
								loading={login.action.isPending}
								onClick={() => {
									login.action.mutate({ token: token() as string });
								}}
							>
								{T()("auth.magic.link.verify.submit")}
							</Button>
						</div>
					</>
				)}
			</Match>
		</Switch>
	);
};

export default MagicLinkVerifyPage;
