import { useLocation, useNavigate } from "@solidjs/router";
import classNames from "classnames";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	type JSXElement,
	Match,
	Suspense,
	Switch,
} from "solid-js";
import { NavigationChrome, Wrapper } from "@/components/Groups/Layout";
import FullPageLoading from "@/components/Partials/FullPageLoading";
import { useInterfaceDirection } from "@/hooks/useInterfaceDirection";
import api from "@/services/api";
import T, { getReady, initAdminTranslations } from "@/translations";
import spawnToast from "@/utils/spawn-toast";

const MainLayout: Component<{
	children?: JSXElement;
}> = (props) => {
	// ----------------------------------
	// Hooks
	const navigate = useNavigate();
	const location = useLocation();
	const interfaceDirection = useInterfaceDirection();
	const [translationsInitialized, setTranslationsInitialized] = createSignal(
		getReady(),
	);

	// ----------------------------------
	// Mutations & Queries
	const authenticatedUser = api.account.useGetAuthenticatedUser({
		queryParams: {},
	});
	const locales = api.locales.useGetMultiple({
		queryParams: {},
	});
	const license = api.license.useGetStatus({
		queryParams: {},
	});

	// ----------------------------------
	// Memos
	const isLoading = createMemo(() => {
		return (
			authenticatedUser.isLoading ||
			locales.isLoading ||
			license.isLoading ||
			(authenticatedUser.isSuccess && translationsInitialized() === false)
		);
	});
	const isSuccess = createMemo(() => {
		return (
			authenticatedUser.isSuccess &&
			locales.isSuccess &&
			license.isSuccess &&
			translationsInitialized()
		);
	});

	// ------------------------------------------------------
	// Effects
	createEffect(() => {
		if (authenticatedUser.isSuccess && translationsInitialized() === false) {
			void initAdminTranslations().finally(() => {
				setTranslationsInitialized(true);
			});
		}

		if (
			authenticatedUser.data?.data.triggerPasswordReset === true &&
			location.pathname !== "/lucid/account"
		) {
			spawnToast({
				title: T()("auth.password.reset.required.title"),
				message: T()("auth.password.reset.required.message"),
				status: "error",
			});

			navigate("/lucid/account");
		}
	});

	// ------------------------------------------------------
	// Render
	return (
		<Switch>
			<Match when={isLoading()}>
				<FullPageLoading />
			</Match>
			<Match when={isSuccess()}>
				<div class="grid grid-cols-1 md:grid-cols-main-layout min-h-full relative">
					<NavigationChrome />
					<main
						class={classNames(
							"flex flex-col md:mt-4 px-4 md:px-0 w-full min-w-0 md:min-w-[calc(100vw-236px)]",
							{
								"md:pr-4": interfaceDirection.isLTR(),
								"md:pl-4": interfaceDirection.isRTL(),
							},
						)}
					>
						<Suspense fallback={<Wrapper />}>{props.children}</Suspense>
					</main>
				</div>
			</Match>
		</Switch>
	);
};

export default MainLayout;
