import { routes as extensionRoutes } from "virtual:lucid-admin";
import { Route, Router } from "@solidjs/router";
import type { Component } from "solid-js";
import AdminExtensionBoundary from "@/components/AdminExtensionBoundary/AdminExtensionBoundary";
import AuthenticatedRoutes from "@/components/AuthenticatedRoutes/AuthenticatedRoutes";
import AuthRoutes from "@/components/AuthRoutes/AuthRoutes";
import BareShell from "@/components/BareShell/BareShell";
import NavigationShell from "@/components/NavigationShell/NavigationShell";
import OAuthRoutes from "@/components/OAuthRoutes/OAuthRoutes";
import PublicRoutes from "@/components/PublicRoutes/PublicRoutes";
import { Permissions } from "@/constants/permissions";
import agentGuard from "@/guards/AgentGuard/AgentGuard";
import ConditionGuard from "@/guards/ConditionGuard/ConditionGuard";
import PermissionGuard from "@/guards/PermissionGuard/PermissionGuard";
import siteStore from "@/store/siteStore/siteStore";
import userStore from "@/store/userStore/userStore";
import lazyPage from "@/utils/lazy-page";
import PermissionSomeGuard from "./guards/PermissionSomeGuard/PermissionSomeGuard";

type LazyRoute = {
	preload: () => Promise<unknown>;
};

// Routes
const ComponentsRoute = lazyPage(
	() => import("@/containers/ComponentLibraryPage/ComponentLibraryPage"),
);
const LoginRoute = lazyPage(() => import("@/containers/LoginPage/LoginPage"));
const SetupRoute = lazyPage(() => import("@/containers/SetupPage/SetupPage"));
const ForgotPasswordRoute = lazyPage(
	() => import("@/containers/ForgotPasswordPage/ForgotPasswordPage"),
);
const ResetPasswordRoute = lazyPage(
	() => import("@/containers/ResetPasswordPage/ResetPasswordPage"),
);
const AcceptInvitationRoute = lazyPage(
	() => import("@/containers/AcceptInvitationPage/AcceptInvitationPage"),
);
const EmailChangeConfirmRoute = lazyPage(
	() => import("@/containers/EmailChangeConfirmPage/EmailChangeConfirmPage"),
);
const EmailChangeRevertRoute = lazyPage(
	() => import("@/containers/EmailChangeRevertPage/EmailChangeRevertPage"),
);
const ShareRoute = lazyPage(
	() => import("@/containers/MediaSharePage/MediaSharePage"),
);
const HomeRoute = lazyPage(() => import("@/containers/HomePage/HomePage"));
const AgentRoute = lazyPage(() => import("@/containers/AgentPage/AgentPage"));
const AgentHistoryRoute = lazyPage(
	() => import("@/containers/AgentHistoryPage/AgentHistoryPage"),
);
const AgentConversationRoute = lazyPage(
	() => import("@/containers/AgentConversationPage/AgentConversationPage"),
);
const AgentRoutinesRoute = lazyPage(
	() => import("@/containers/AgentRoutinesPage/AgentRoutinesPage"),
);
const MediaListRoute = lazyPage(
	() => import("@/containers/MediaPage/MediaPage"),
);
const UsersListRoute = lazyPage(
	() => import("@/containers/UsersPage/UsersPage"),
);
const RolesListRoute = lazyPage(
	() => import("@/containers/RolesPage/RolesPage"),
);
const SystemIndexRoute = lazyPage(
	() => import("@/containers/SystemRedirectPage/SystemRedirectPage"),
);
const SystemOverviewRoute = lazyPage(
	() => import("@/containers/SystemOverviewPage/SystemOverviewPage"),
);
const SystemOperationsRoute = lazyPage(
	() => import("@/containers/SystemOperationsPage/SystemOperationsPage"),
);
const SystemAiUsageRoute = lazyPage(
	() => import("@/containers/SystemAiUsagePage/SystemAiUsagePage"),
);
const SystemIntegrationsRoute = lazyPage(
	() => import("@/containers/SystemIntegrationsPage/SystemIntegrationsPage"),
);
const SystemJobsRoute = lazyPage(
	() => import("@/containers/SystemJobsPage/SystemJobsPage"),
);
const EmailListRoute = lazyPage(
	() => import("@/containers/EmailsPage/EmailsPage"),
);
const ReleasesListRoute = lazyPage(
	() => import("@/containers/ReleasesPage/ReleasesPage"),
);
const PublishingOverviewRoute = lazyPage(
	() => import("@/containers/PublishingOverviewPage/PublishingOverviewPage"),
);
const AccountRoute = lazyPage(
	() => import("@/containers/AccountPage/AccountPage"),
);
const OAuthConsentRoute = lazyPage(
	() => import("@/containers/OAuthConsentPage/OAuthConsentPage"),
);
const CollectionsDocumentsListRoute = lazyPage(
	() => import("@/containers/DocumentsPage/DocumentsPage"),
);
const CollectionDocumentPageBuilderRoute = lazyPage(
	() => import("@/containers/DocumentEditorPage/DocumentEditorPage"),
);
const CollectionsDocumentsHistoryRoute = lazyPage(
	() => import("@/containers/DocumentHistoryPage/DocumentHistoryPage"),
);
const ReleaseRoute = lazyPage(
	() => import("@/containers/ReleasePage/ReleasePage"),
);
const ReleaseProposalRoute = lazyPage(
	() => import("@/containers/ReleaseContentPage/ReleaseContentPage"),
);

const preloadRoutes =
	(...routes: LazyRoute[]) =>
	() => {
		void Promise.all(routes.map((route) => route.preload()));
	};

const extensionRoute = (route: (typeof extensionRoutes)[number]) => (
	<Route
		path={route.path.slice("/lucid".length)}
		component={() => {
			const page = (
				<AdminExtensionBoundary name={route.key} placement="page">
					<route.component options={route.options} />
				</AdminExtensionBoundary>
			);
			return route.access === "public" || !route.permission ? (
				page
			) : (
				<PermissionGuard permission={route.permission}>{page}</PermissionGuard>
			);
		}}
	/>
);

const AppRouter: Component = () => {
	return (
		<Router preload>
			{/* Authenticated */}
			<Route component={AuthenticatedRoutes}>
				<Route path="/lucid" component={NavigationShell}>
					<Route path="/" component={HomeRoute} />
					{/* Agent */}
					<Route
						path="/agent"
						preload={preloadRoutes(AgentRoute)}
						component={agentGuard(AgentRoute)}
					/>
					<Route
						path="/agent/history"
						preload={preloadRoutes(AgentHistoryRoute)}
						component={agentGuard(AgentHistoryRoute)}
					/>
					<Route
						path="/agent/chats/:conversationId"
						preload={preloadRoutes(AgentConversationRoute)}
						component={agentGuard(AgentConversationRoute)}
					/>
					<Route
						path="/agent/routines"
						preload={preloadRoutes(AgentRoutinesRoute)}
						component={agentGuard(AgentRoutinesRoute)}
					/>
					<Route path="/components" component={ComponentsRoute} />
					<Route path="/account" component={AccountRoute} />
					{extensionRoutes
						.filter((route) => route.shell === "navigation")
						.map(extensionRoute)}
					{/* Collections */}
					<Route
						path="/collections/:collectionKey"
						preload={preloadRoutes(CollectionsDocumentsListRoute)}
						component={() => <CollectionsDocumentsListRoute />}
					/>
					{/* Page builder */}
					<Route
						path="/collections/:collectionKey/latest/create"
						preload={preloadRoutes(CollectionDocumentPageBuilderRoute)}
						component={() => (
							<CollectionDocumentPageBuilderRoute
								mode="create"
								version="latest"
							/>
						)}
					/>
					<Route
						path="/collections/:collectionKey/:versionType/:documentId/:versionId?"
						preload={preloadRoutes(CollectionDocumentPageBuilderRoute)}
						component={() => <CollectionDocumentPageBuilderRoute mode="edit" />}
					/>
					<Route
						path="/collections/:collectionKey/:documentId/history"
						preload={preloadRoutes(CollectionsDocumentsHistoryRoute)}
						component={() => <CollectionsDocumentsHistoryRoute />}
					/>
					{/* Media */}
					<Route
						path="/media"
						preload={preloadRoutes(MediaListRoute)}
						component={() => (
							<PermissionGuard permission={Permissions.MediaRead}>
								<MediaListRoute />
							</PermissionGuard>
						)}
					/>
					<Route
						path="/media/:folderId"
						preload={preloadRoutes(MediaListRoute)}
						component={() => (
							<PermissionGuard permission={Permissions.MediaRead}>
								<MediaListRoute />
							</PermissionGuard>
						)}
					/>
					{/* Users */}
					<Route
						path="/users"
						preload={preloadRoutes(UsersListRoute)}
						component={() => (
							<PermissionGuard permission={Permissions.UsersRead}>
								<UsersListRoute />
							</PermissionGuard>
						)}
					/>
					{/* Roles */}
					<Route
						path="/roles"
						preload={preloadRoutes(RolesListRoute)}
						component={() => (
							<PermissionGuard permission={Permissions.RolesRead}>
								<RolesListRoute />
							</PermissionGuard>
						)}
					/>
					{/* Emails */}
					<Route
						path="/emails"
						preload={preloadRoutes(EmailListRoute)}
						component={() => (
							<PermissionGuard permission={Permissions.EmailRead}>
								<EmailListRoute />
							</PermissionGuard>
						)}
					/>
					<Route
						path="/publishing"
						preload={preloadRoutes(PublishingOverviewRoute)}
						component={() => (
							<PermissionGuard permission={Permissions.ReleasesRead}>
								<PublishingOverviewRoute />
							</PermissionGuard>
						)}
					/>
					<Route
						path="/releases"
						preload={preloadRoutes(ReleasesListRoute)}
						component={() => (
							<PermissionGuard permission={Permissions.ReleasesRead}>
								<ReleasesListRoute />
							</PermissionGuard>
						)}
					/>
					<Route
						path="/releases/:releaseId"
						preload={preloadRoutes(ReleaseRoute)}
						component={() => (
							<PermissionGuard permission={Permissions.ReleasesRead}>
								<ReleaseRoute />
							</PermissionGuard>
						)}
					/>
					<Route
						path="/releases/:releaseId/content/:collectionKey/:documentId"
						preload={preloadRoutes(ReleaseProposalRoute)}
						component={() => (
							<PermissionGuard permission={Permissions.ReleasesRead}>
								<ReleaseProposalRoute />
							</PermissionGuard>
						)}
					/>
					{/* System */}
					<Route
						path="/system"
						preload={preloadRoutes(SystemIndexRoute)}
						component={() => <SystemIndexRoute />}
					/>
					<Route
						path="/system/overview"
						preload={preloadRoutes(SystemOverviewRoute)}
						component={() => (
							<PermissionGuard permission={Permissions.SettingsRead}>
								<SystemOverviewRoute />
							</PermissionGuard>
						)}
					/>
					<Route
						path="/system/operations"
						preload={preloadRoutes(SystemOperationsRoute)}
						component={() => (
							<PermissionGuard permission={Permissions.SettingsRead}>
								<SystemOperationsRoute />
							</PermissionGuard>
						)}
					/>
					<Route
						path="/system/ai-usage"
						preload={preloadRoutes(SystemAiUsageRoute)}
						component={() => (
							<ConditionGuard
								condition={() => siteStore.get.hasAnyAiFeatureEnabled()}
								redirect={() =>
									userStore.get.hasPermission([Permissions.SettingsRead]).all
										? "/lucid/system/overview"
										: "/lucid"
								}
							>
								<PermissionGuard permission={Permissions.SettingsRead}>
									<SystemAiUsageRoute />
								</PermissionGuard>
							</ConditionGuard>
						)}
					/>
					<Route
						path="/system/jobs"
						preload={preloadRoutes(SystemJobsRoute)}
						component={() => (
							<PermissionGuard permission={Permissions.JobsRead}>
								<SystemJobsRoute />
							</PermissionGuard>
						)}
					/>
					<Route
						path="/system/integrations"
						preload={preloadRoutes(SystemIntegrationsRoute)}
						component={() => (
							<PermissionSomeGuard
								permission={[
									Permissions.IntegrationsRead,
									Permissions.ConnectionUpdate,
								]}
							>
								<SystemIntegrationsRoute />
							</PermissionSomeGuard>
						)}
					/>
				</Route>
				{/* Authenticated OAuth */}
				<Route path="/lucid" component={OAuthRoutes}>
					<Route
						path="/oauth/consent/:requestId"
						preload={preloadRoutes(OAuthConsentRoute)}
						component={OAuthConsentRoute}
					/>
				</Route>
				<Route path="/lucid" component={BareShell}>
					{extensionRoutes
						.filter(
							(route) =>
								route.shell === "none" && route.access === "authenticated",
						)
						.map(extensionRoute)}
				</Route>
			</Route>
			{/* Public extensions work both with and without a session. */}
			<Route path="/lucid" component={BareShell}>
				{extensionRoutes
					.filter(
						(route) => route.shell === "none" && route.access === "public",
					)
					.map(extensionRoute)}
			</Route>
			{/* Non authenticated */}
			<Route path="/lucid" component={AuthRoutes}>
				<Route path="/login" component={LoginRoute} />
				<Route path="/setup" component={SetupRoute} />
				<Route path="/forgot-password" component={ForgotPasswordRoute} />
				<Route path="/reset-password" component={ResetPasswordRoute} />
				<Route path="/accept-invitation" component={AcceptInvitationRoute} />
			</Route>
			<Route path="/lucid" component={PublicRoutes}>
				<Route
					path="/email-change/confirm"
					component={EmailChangeConfirmRoute}
				/>
				<Route path="/email-change/revert" component={EmailChangeRevertRoute} />
				<Route path="/share/:token" component={ShareRoute} />
			</Route>
		</Router>
	);
};

export default AppRouter;
