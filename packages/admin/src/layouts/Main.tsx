import { useLocation, useNavigate } from "@solidjs/router";
import {
	type Component,
	createEffect,
	createMemo,
	type JSXElement,
	Match,
	Suspense,
	Switch,
} from "solid-js";
import { NavigationChrome, Wrapper } from "@/components/Groups/Layout";
import FullPageLoading from "@/components/Partials/FullPageLoading";
import api from "@/services/api";
import T, { initAdminTranslations } from "@/translations";
import spawnToast from "@/utils/spawn-toast";

const MainLayout: Component<{
	children?: JSXElement;
}> = (props) => {
	// ----------------------------------
	// Hooks
	const navigate = useNavigate();
	const location = useLocation();

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
			authenticatedUser.isLoading || locales.isLoading || license.isLoading
		);
	});
	const isSuccess = createMemo(() => {
		return (
			authenticatedUser.isSuccess && locales.isSuccess && license.isSuccess
		);
	});

	// ------------------------------------------------------
	// Effects
	createEffect(() => {
		if (authenticatedUser.isSuccess) {
			void initAdminTranslations();
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
		<div class="grid grid-cols-1 md:grid-cols-main-layout min-h-full relative">
			<NavigationChrome />
			<main class="flex flex-col md:mt-4 px-4 md:px-0 md:pr-4 w-full min-w-0 md:min-w-[calc(100vw-236px)]">
				<Switch>
					<Match when={isSuccess()}>
						<Suspense fallback={<Wrapper />}>{props.children}</Suspense>
					</Match>
					<Match when={isLoading()}>
						<FullPageLoading />
					</Match>
				</Switch>
			</main>
		</div>
	);
};

export default MainLayout;
