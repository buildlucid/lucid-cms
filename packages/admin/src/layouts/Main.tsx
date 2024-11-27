import T from "@/translations";
import {
	type Component,
	Switch,
	Match,
	createMemo,
	type JSXElement,
	createEffect,
} from "solid-js";
import { useNavigate, useLocation } from "@solidjs/router";
import LogoIcon from "@/assets/svgs/logo-icon.svg";
import api from "@/services/api";
import Layout from "@/components/Groups/Layout";
import spawnToast from "@/utils/spawn-toast";

interface MainLayoutProps {
	children?: JSXElement;
}

const MainLayout: Component<MainLayoutProps> = (props) => {
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

	// ----------------------------------
	// Memos
	const isLoading = createMemo(() => {
		return authenticatedUser.isLoading || locales.isLoading;
	});
	const isSuccess = createMemo(() => {
		return authenticatedUser.isSuccess && locales.isSuccess;
	});

	// ------------------------------------------------------
	// Effects
	createEffect(() => {
		if (
			authenticatedUser.data?.data.triggerPasswordReset === 1 &&
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
			<Layout.NavigationSidebar />
			<main class="flex flex-col overflow-x-hidden mt-15 mr-15 rounded-t-xl">
				<Switch>
					<Match when={isSuccess()}>{props.children}</Match>
					<Match when={isLoading()}>
						<div class="fixed inset-0 z-50 bg-container-1 flex items-center justify-center">
							<div class="absolute inset-0 z-20 flex-col flex items-center justify-center">
								<img src={LogoIcon} alt="logo" class="size-6 animate-spin" />
							</div>
						</div>
					</Match>
				</Switch>
			</main>
		</div>
	);
};

export default MainLayout;
