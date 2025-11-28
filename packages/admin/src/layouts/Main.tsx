import T from "@/translations";
import {
	type Component,
	Switch,
	Match,
	createMemo,
	type JSXElement,
	createEffect,
	Suspense,
} from "solid-js";
import { useNavigate, useLocation } from "@solidjs/router";
import api from "@/services/api";
import { NavigationSidebar, Wrapper } from "@/components/Groups/Layout";
import spawnToast from "@/utils/spawn-toast";
import FullPageLoading from "@/components/Partials/FullPageLoading";

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
		if (
			authenticatedUser.data?.data.triggerPasswordReset === true &&
			location.pathname !== "/admin/account"
		) {
			spawnToast({
				title: T()("password_reset_required"),
				message: T()("please_reset_password_message"),
				status: "error",
			});

			navigate("/admin/account");
		}
	});

	// ------------------------------------------------------
	// Render
	return (
		<div class="grid grid-cols-main-layout min-h-full relative">
			<NavigationSidebar />
			<main class="flex flex-col mt-4 pr-4 w-full min-w-[calc(100vw-236px)]">
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
