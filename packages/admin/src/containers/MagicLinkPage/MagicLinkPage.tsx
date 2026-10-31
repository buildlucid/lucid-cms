import { useLocation, useNavigate } from "@solidjs/router";
import { TbOutlineAlertTriangle } from "solid-icons/tb";
import {
	type Component,
	createEffect,
	createMemo,
	Match,
	Switch,
} from "solid-js";
import AuthSkeleton from "@/components/AuthSkeleton/AuthSkeleton";
import ErrorState from "@/components/ErrorState/ErrorState";
import MagicLinkCodeForm from "@/components/MagicLinkCodeForm/MagicLinkCodeForm";
import MagicLinkRequestForm from "@/components/MagicLinkRequestForm/MagicLinkRequestForm";
import ThemeLogoIcon from "@/components/ThemeLogoIcon/ThemeLogoIcon";
import { usePageTitle } from "@/hooks/usePageTitle/usePageTitle";
import api from "@/services/api";
import T from "@/translations";

/** History state that moves the page from the email step to the code step. */
export type MagicLinkPageState = {
	email?: string;
};

const MagicLinkPage: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const location = useLocation<MagicLinkPageState>();
	const navigate = useNavigate();
	usePageTitle(() =>
		location.state?.email
			? T()("routes.auth.magic.link.code.title")
			: T()("routes.auth.magic.link.title"),
	);

	// ----------------------------------------
	// Queries
	const providers = api.auth.useGetProviders({
		queryParams: {},
	});
	//* pages with captcha forms wait for its settings, so the widget's space is there from the first paint
	const captchaSettings = api.captcha.useGetSettings();

	// ----------------------------------------
	// Memos
	const sentTo = createMemo(() => location.state?.email);
	const isReady = createMemo(
		() => providers.isSuccess && providers.data?.data.magicLink === true,
	);

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (providers.isSuccess && providers.data?.data.magicLink === false) {
			navigate(`/admin/login${location.search}`, { replace: true });
		}
	});

	// ----------------------------------------
	// Render
	return (
		<Switch>
			<Match when={providers.isLoading || captchaSettings.isPending}>
				<AuthSkeleton />
			</Match>
			<Match when={providers.isError}>
				<ErrorState
					icon={<TbOutlineAlertTriangle />}
					title={T()("errors.generic.title")}
					description={T()("errors.generic.message")}
				/>
			</Match>
			<Match when={isReady() && sentTo()}>
				{(email) => (
					<>
						<ThemeLogoIcon class="h-8 mx-auto mb-6" />
						<h1 class="mb-1 text-center">
							{T()("routes.auth.magic.link.code.title")}
						</h1>
						<p class="text-center max-w-sm mx-auto">
							{T()("routes.auth.magic.link.code.description")}{" "}
							<span class="font-medium text-subtitle break-words">
								{email()}
							</span>
							.
						</p>
						<div class="my-10">
							<MagicLinkCodeForm email={email()} />
						</div>
					</>
				)}
			</Match>
			<Match when={isReady()}>
				<ThemeLogoIcon class="h-8 mx-auto mb-6" />
				<h1 class="mb-1 text-center">{T()("routes.auth.magic.link.title")}</h1>
				<p class="text-center max-w-sm mx-auto">
					{T()("routes.auth.magic.link.description")}
				</p>
				<div class="my-10">
					<MagicLinkRequestForm
						showBackToLogin={true}
						onSent={(email) => {
							navigate(`${location.pathname}${location.search}`, {
								state: { email } satisfies MagicLinkPageState,
							});
						}}
					/>
				</div>
			</Match>
		</Switch>
	);
};

export default MagicLinkPage;
