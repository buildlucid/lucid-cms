import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { type Component, createEffect, on, onMount } from "solid-js";
import { Toaster } from "solid-toast";
import Router from "@/Router";
import tenantStore from "@/store/tenantStore";
import { getLocale, getReady, initAdminTranslations } from "@/translations";
import { LucidError } from "./utils/error-handling";
import "solid-devtools";

const App: Component = () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: (_, error) => {
					if (error instanceof LucidError) {
						switch (error.errorRes.status) {
							case 401:
								return false;
							case 403:
								return false;
							case 404:
								return false;
							case 429:
								return false;
							default:
								return true;
						}
					}
					return true;
				},
			},
		},
	});

	// ---------------------------------
	// Effects
	onMount(() => {
		void initAdminTranslations();
	});

	createEffect(
		on(
			getLocale,
			() => {
				if (!getReady()) return;
				void queryClient.invalidateQueries();
			},
			{ defer: true },
		),
	);

	createEffect(
		on(
			() => tenantStore.get.tenant,
			() => {
				if (!getReady()) return;
				void queryClient.invalidateQueries();
			},
			{ defer: true },
		),
	);

	// ---------------------------------
	// Render
	return (
		<QueryClientProvider client={queryClient}>
			<Toaster
				toastOptions={{
					duration: 5000,
					position: "bottom-left",
				}}
			/>
			<Router />
		</QueryClientProvider>
	);
};

export default App;
