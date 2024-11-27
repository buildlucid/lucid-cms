import type { Component } from "solid-js";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { Toaster } from "solid-toast";
import { LucidError } from "./utils/error-handling";
import Router from "@/Router";
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
