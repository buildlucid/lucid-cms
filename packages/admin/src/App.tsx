import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { type Component, createEffect, on, onMount } from "solid-js";
import { Toaster } from "solid-toast";
import Router from "@/Router";
import { getLocale, getReady, initAdminTranslations } from "@/translations";
import { LucidError } from "./utils/error-handling";

const App: Component = () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: (failureCount, error) => {
					if (failureCount >= 2) return false;
					if (
						error instanceof LucidError &&
						error.errorRes.status >= 400 &&
						error.errorRes.status < 500
					)
						return false;
					return !(
						error instanceof DOMException && error.name === "AbortError"
					);
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
