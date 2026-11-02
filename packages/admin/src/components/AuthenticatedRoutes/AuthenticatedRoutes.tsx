import {
	createEffect,
	createSignal,
	Index,
	type ParentComponent,
	Show,
	untrack,
} from "solid-js";
import FullPageLoading from "@/components/FullPageLoading/FullPageLoading";
import ReauthenticateModal from "@/components/ReauthenticateModal/ReauthenticateModal";
import UpdatePasswordModal from "@/components/UpdatePasswordModal/UpdatePasswordModal";
import api from "@/services/api";
import userPreferencesStore from "@/store/userPreferencesStore/userPreferencesStore";
import {
	getLocale,
	getReady,
	initAdminTranslations,
	setLocale,
} from "@/translations";

/** Checks the session before mounting protected layouts and route components. */
const AuthenticatedRoutes: ParentComponent = (props) => {
	// ----------------------------------
	// State & Hooks
	const [translationsInitialized, setTranslationsInitialized] =
		createSignal(getReady());
	const [forcedPasswordModalOpen, setForcedPasswordModalOpen] =
		createSignal(false);

	// ----------------------------------
	// Queries
	const authenticatedUser = api.account.useGetAuthenticatedUser({
		queryParams: {},
	});

	// ----------------------------------
	// Effects
	createEffect(() => {
		if (!authenticatedUser.isSuccess) return;
		setForcedPasswordModalOpen(
			authenticatedUser.data.data.triggerPasswordReset === true,
		);
		if (!translationsInitialized()) {
			void initAdminTranslations(
				untrack(userPreferencesStore.getInterfaceLocale),
			).finally(() => setTranslationsInitialized(true));
		}
	});
	createEffect(() => {
		const locale = userPreferencesStore.getInterfaceLocale();
		if (!locale || !translationsInitialized()) return;
		if (locale !== untrack(getLocale)) setLocale(locale);
	});

	// ----------------------------------
	// Render
	return (
		<Show
			when={authenticatedUser.isSuccess && translationsInitialized()}
			fallback={
				//* sketches the navigation shell. Translations may not be ready, so FullPageLoading carries the only label
				<div class="grid min-h-screen grid-cols-1 md:grid-cols-main-layout">
					<aside
						class="hidden md:flex w-sidebar flex-col gap-1 bg-sidebar px-4 pt-6"
						aria-hidden="true"
					>
						<span class="skeleton ms-2 block h-8 w-24" />
						<span class="skeleton mt-4 mb-6 block h-9 w-full" />
						<Index each={Array.from({ length: 6 })}>
							{() => <span class="skeleton block h-8 w-full" />}
						</Index>
					</aside>
					<main class="relative min-h-screen md:mt-4 md:min-h-0 md:pe-4">
						<FullPageLoading />
					</main>
				</div>
			}
		>
			{props.children}
			<UpdatePasswordModal
				state={{
					open: forcedPasswordModalOpen(),
					setOpen: setForcedPasswordModalOpen,
				}}
				options={{ forced: true }}
			/>
			<ReauthenticateModal />
		</Show>
	);
};

export default AuthenticatedRoutes;
