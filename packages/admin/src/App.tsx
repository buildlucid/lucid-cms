import {
	QueryCache,
	QueryClient,
	QueryClientProvider,
} from "@tanstack/solid-query";
import { type Component, createEffect, on, onMount } from "solid-js";
import { Toaster } from "solid-toast";
import Router from "@/Router";
import T, { getLocale, getReady, initAdminTranslations } from "@/translations";
import spawnToast from "@/utils/spawn-toast";
import { LucidError } from "./utils/error-handling";

const App: Component = () => {
	//* queries whose last refresh failed, so one that keeps failing is only reported once
	const failedRefreshes = new Set<string>();
	const queryClient = new QueryClient({
		queryCache: new QueryCache({
			//* Retained data hides refresh errors, so report them with a toast.
			onError: (error, query) => {
				if (query.state.data === undefined) return;
				if (failedRefreshes.has(query.queryHash)) return;
				if (error instanceof DOMException && error.name === "AbortError") {
					return;
				}
				if (
					error instanceof LucidError &&
					(error.toasted || error.errorRes.status === 401)
				) {
					return;
				}

				failedRefreshes.add(query.queryHash);
				spawnToast({
					title: T()("states.refresh.failed.title"),
					message: T()("states.refresh.failed.message"),
					status: "error",
				});
			},
			onSuccess: (_data, query) => {
				failedRefreshes.delete(query.queryHash);
			},
		}),
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
				containerStyle={{ left: "2rem", bottom: "2rem" }}
			/>
			<Router />
		</QueryClientProvider>
	);
};

export default App;
