import type { DiagnosticCheckKey, DiagnosticCheckResult } from "@types";
import { createMemo, createSignal } from "solid-js";
import {
	agentSlots,
	brickSlots,
	captchaSlots,
	documentListSlots,
	fieldSlots,
	homeSlots,
	maintenanceSlots,
	routes,
} from "virtual:lucid-admin";
import api from "@/services/api";
import {
	buildDiagnosticsReport,
	type ClientDiagnostics,
} from "@/utils/diagnostics-report";

/** Loads diagnostics, runs checks and builds a report shared by the page and support tools. */
export const useDiagnostics = () => {
	// ----------------------------------------
	// State & Hooks
	const [checkResults, setCheckResults] = createSignal<DiagnosticCheckResult[]>(
		[],
	);

	// ----------------------------------------
	// Queries & Mutations
	const settings = api.settings.useGetSettings({
		queryParams: {
			include: {
				email: true,
				mcp: true,
				agents: true,
				media: true,
				system: true,
			},
		},
	});
	const diagnostics = api.diagnostics.useGetDiagnostics();
	const checks = api.diagnostics.useRunChecks({
		onSuccess: (response) => {
			//* keeps earlier results for checks this run didn't cover
			setCheckResults((previous) => [
				...previous.filter(
					(result) => !response.data.some((next) => next.key === result.key),
				),
				...response.data,
			]);
		},
	});

	// ----------------------------------------
	// Memos
	//* the response time stands in for the browser's clock when the server read its own
	const clockSkew = createMemo(() => {
		const server = diagnostics.data?.data.server;
		if (!server) return null;
		return Math.round(
			(Date.parse(server.time) - diagnostics.dataUpdatedAt) / 1000,
		);
	});

	// ----------------------------------------
	// Functions
	const client = (): ClientDiagnostics => ({
		userAgent: navigator.userAgent,
		language: navigator.language,
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		window: `${window.innerWidth} × ${window.innerHeight}`,
		extensions: {
			routes: routes.map((route) => route.key),
			slots: [
				agentSlots,
				brickSlots,
				captchaSlots,
				documentListSlots,
				fieldSlots,
				homeSlots,
				maintenanceSlots,
			].reduce((total, slots) => total + slots.length, 0),
		},
	});
	const report = () => {
		const diagnosticsData = diagnostics.data?.data;
		const settingsData = settings.data?.data;
		if (!diagnosticsData || !settingsData) return undefined;

		return buildDiagnosticsReport({
			diagnostics: diagnosticsData,
			settings: settingsData,
			client: client(),
			clockSkew: clockSkew(),
			checks: checkResults(),
		});
	};

	return {
		settings,
		diagnostics,
		loading: () => settings.isLoading || diagnostics.isLoading,
		error: () => settings.isError || diagnostics.isError,
		refetch: () => {
			void settings.refetch();
			void diagnostics.refetch();
		},
		clockSkew,
		client,
		checks: {
			results: checkResults,
			result: (key: DiagnosticCheckKey) =>
				checkResults().find((result) => result.key === key),
			run: (keys: DiagnosticCheckKey[]) =>
				checks.action.mutate({ checks: keys }),
			running: (key: DiagnosticCheckKey) =>
				checks.action.isPending &&
				checks.action.variables?.checks.includes(key) === true,
		},
		report,
	};
};

export type DiagnosticsState = ReturnType<typeof useDiagnostics>;
