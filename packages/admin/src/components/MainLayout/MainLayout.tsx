import classNames from "classnames";
import {
	type Component,
	createEffect,
	createMemo,
	type JSXElement,
	Show,
	Suspense,
} from "solid-js";
import FullPageLoading from "@/components/FullPageLoading/FullPageLoading";
import { Navigation } from "@/components/Navigation/Navigation";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import { useInterfaceDirection } from "@/hooks/useInterfaceDirection/useInterfaceDirection";
import api from "@/services/api";
import siteStore from "@/store/siteStore/siteStore";

const MainLayout: Component<{
	children?: JSXElement;
}> = (props) => {
	// ----------------------------------
	// Hooks
	const interfaceDirection = useInterfaceDirection();

	// ----------------------------------
	// Mutations & Queries
	const locales = api.locales.useGetMultiple({
		queryParams: {},
	});
	const connection = api.connection.useGetStatus({
		queryParams: {},
	});
	const settings = api.settings.useGetSettings({
		queryParams: {
			include: {
				ai: true,
			},
		},
	});

	// ----------------------------------
	// Memos
	const isLoading = createMemo(() => {
		return locales.isLoading || connection.isLoading || settings.isLoading;
	});
	const isSuccess = createMemo(() => {
		return locales.isSuccess && connection.isSuccess && settings.isSuccess;
	});

	// ------------------------------------------------------
	// Effects
	createEffect(() => {
		if (connection.isSuccess) {
			siteStore.setConnection(connection.data.data);
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
				<Navigation />
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
							<PageLayout>
								<div />
							</PageLayout>
						}
					>
						<Suspense fallback={<PageLayout />}>{props.children}</Suspense>
					</Show>
					<Show when={isLoading()}>
						<FullPageLoading />
					</Show>
				</main>
			</div>
		</Show>
	);
};

export default MainLayout;
