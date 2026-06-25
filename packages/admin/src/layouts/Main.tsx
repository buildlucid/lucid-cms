import classNames from "classnames";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	type JSXElement,
	Show,
	Suspense,
} from "solid-js";
import { NavigationChrome, Wrapper } from "@/components/Groups/Layout";
import UpdatePasswordModal from "@/components/Modals/User/UpdatePassword";
import FullPageLoading from "@/components/Partials/FullPageLoading";
import { useInterfaceDirection } from "@/hooks/useInterfaceDirection";
import api from "@/services/api";
import siteStore from "@/store/siteStore";
import tenantStore from "@/store/tenantStore";
import { getReady, initAdminTranslations } from "@/translations";

const MainLayout: Component<{
	children?: JSXElement;
}> = (props) => {
	// ----------------------------------
	// Hooks
	const interfaceDirection = useInterfaceDirection();
	const [translationsInitialized, setTranslationsInitialized] = createSignal(
		getReady(),
	);
	const [forcedPasswordModalOpen, setForcedPasswordModalOpen] =
		createSignal(false);

	// ----------------------------------
	// Mutations & Queries
	const authenticatedUser = api.account.useGetAuthenticatedUser({
		queryParams: {},
	});
	const tenantScopedQueriesEnabled = createMemo(() => {
		if (!authenticatedUser.isSuccess) return false;

		const user = authenticatedUser.data.data;
		if (user.superAdmin === true) return true;
		if ((user.tenants ?? []).length === 0) return true;

		return tenantStore.get.tenant !== undefined;
	});
	const locales = api.locales.useGetMultiple({
		queryParams: {},
	});
	const license = api.license.useGetStatus({
		queryParams: {},
		enabled: tenantScopedQueriesEnabled,
	});
	const settings = api.settings.useGetSettings({
		queryParams: {
			include: {
				ai: true,
			},
		},
		enabled: tenantScopedQueriesEnabled,
	});

	// ----------------------------------
	// Memos
	const isLoading = createMemo(() => {
		return (
			authenticatedUser.isLoading ||
			locales.isLoading ||
			license.isLoading ||
			settings.isLoading ||
			(authenticatedUser.isSuccess && translationsInitialized() === false)
		);
	});
	const isSuccess = createMemo(() => {
		return (
			authenticatedUser.isSuccess &&
			locales.isSuccess &&
			license.isSuccess &&
			settings.isSuccess &&
			translationsInitialized()
		);
	});
	const requiresPasswordReset = createMemo(() => {
		return authenticatedUser.data?.data.triggerPasswordReset === true;
	});

	// ------------------------------------------------------
	// Effects
	createEffect(() => {
		if (authenticatedUser.isSuccess && translationsInitialized() === false) {
			void initAdminTranslations().finally(() => {
				setTranslationsInitialized(true);
			});
		}
	});

	createEffect(() => {
		if (!authenticatedUser.isSuccess) return;
		setForcedPasswordModalOpen(requiresPasswordReset());
	});

	createEffect(() => {
		if (license.isSuccess) {
			siteStore.setLicense(license.data.data);
		}

		if (settings.isSuccess) {
			siteStore.setAi(settings.data.data.ai);
		}
	});

	// ------------------------------------------------------
	// Render
	return (
		<Show when={isLoading() || isSuccess()}>
			<div class="grid grid-cols-1 md:grid-cols-main-layout min-h-full relative">
				<NavigationChrome />
				<main
					class={classNames(
						"relative flex flex-col md:mt-4 px-4 md:px-0 w-full min-w-0 md:min-w-[calc(100vw-236px)]",
						{
							"md:pr-4": interfaceDirection.isLTR(),
							"md:pl-4": interfaceDirection.isRTL(),
						},
					)}
					aria-busy={isLoading()}
				>
					<Show
						when={isSuccess()}
						fallback={
							<Wrapper>
								<div />
							</Wrapper>
						}
					>
						<Suspense fallback={<Wrapper />}>{props.children}</Suspense>
					</Show>
					<Show when={isLoading()}>
						<FullPageLoading />
					</Show>
				</main>
				<Show when={isSuccess()}>
					<UpdatePasswordModal
						state={{
							open: forcedPasswordModalOpen(),
							setOpen: setForcedPasswordModalOpen,
						}}
						options={{
							forced: true,
						}}
					/>
				</Show>
			</div>
		</Show>
	);
};

export default MainLayout;
