import { Route, Router } from "@solidjs/router";
import { type Component, lazy } from "solid-js";
import { Permissions } from "@/constants/permissions";
import ConditionGuard from "@/guards/Condition";
import PermissionGuard from "@/guards/Permission";
import AuthRoutes from "@/layouts/AuthRoutes";
import MainLayout from "@/layouts/Main";
import PublicRoutes from "@/layouts/PublicRoutes";
import siteStore from "@/store/siteStore";
import userStore from "@/store/userStore";

type LazyRoute = {
	preload: () => Promise<unknown>;
};

// Routes
const ComponentsRoute = lazy(() => import("@/routes/Components"));
const LoginRoute = lazy(() => import("@/routes/Login"));
const SetupRoute = lazy(() => import("@/routes/Setup"));
const ForgotPasswordRoute = lazy(() => import("@/routes/ForgotPassword"));
const ResetPasswordRoute = lazy(() => import("@/routes/ResetPassword"));
const AcceptInvitationRoute = lazy(() => import("@/routes/AcceptInvitation"));
const EmailChangeConfirmRoute = lazy(
	() => import("@/routes/EmailChangeConfirm"),
);
const EmailChangeRevertRoute = lazy(() => import("@/routes/EmailChangeRevert"));
const ShareRoute = lazy(() => import("@/routes/Share"));
const DashboardRoute = lazy(() => import("@/routes/Dashboard"));
const MediaListRoute = lazy(() => import("@/routes/Media/List"));
const UsersListRoute = lazy(() => import("@/routes/Users/List"));
const RolesListRoute = lazy(() => import("@/routes/Roles/List"));
const SystemIndexRoute = lazy(() => import("@/routes/System/Index"));
const SystemOverviewRoute = lazy(() => import("@/routes/System/Overview/View"));
const SystemOperationsRoute = lazy(
	() => import("@/routes/System/Operations/View"),
);
const SystemAiUsageRoute = lazy(() => import("@/routes/System/AiUsage/View"));
const SystemClientIntegrationsRoute = lazy(
	() => import("@/routes/System/ClientIntegrations/View"),
);
const SystemLicenseRoute = lazy(() => import("@/routes/System/License/View"));
const SystemQueueObservabilityRoute = lazy(
	() => import("@/routes/System/QueueObservability/View"),
);
const EmailListRoute = lazy(() => import("@/routes/Emails/List"));
const ReleaseRequestsListRoute = lazy(
	() => import("@/routes/ReleaseRequests/List"),
);
const AccountRoute = lazy(() => import("@/routes/Account"));
const CollectionsDocumentsListRoute = lazy(
	() => import("./routes/Collections/Documents/List"),
);
const CollectionDocumentPageBuilderRoute = lazy(
	() => import("./routes/Collections/Documents/PageBuilder"),
);
const CollectionsDocumentsHistoryRoute = lazy(
	() => import("./routes/Collections/Documents/History"),
);
const CollectionsDocumentsReleaseRequestDetailRoute = lazy(
	() => import("./routes/Collections/Documents/ReleaseRequestDetail"),
);

const preloadRoutes =
	(...routes: LazyRoute[]) =>
	() => {
		void Promise.all(routes.map((route) => route.preload()));
	};

const AppRouter: Component = () => {
	return (
		<Router preload>
			{/* Authenticated */}
			<Route path="/lucid" component={MainLayout}>
				<Route path="/" component={DashboardRoute} />
				<Route path="/components" component={ComponentsRoute} />
				<Route path="/account" component={AccountRoute} />
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
				<Route
					path="/collections/:collectionKey/:documentId/release-requests/:releaseRequestId"
					preload={preloadRoutes(CollectionsDocumentsReleaseRequestDetailRoute)}
					component={() => (
						<PermissionGuard permission={Permissions.PublishOperationsRead}>
							<CollectionsDocumentsReleaseRequestDetailRoute />
						</PermissionGuard>
					)}
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
					path="/release-requests"
					preload={preloadRoutes(ReleaseRequestsListRoute)}
					component={() => (
						<PermissionGuard permission={Permissions.PublishOperationsRead}>
							<ReleaseRequestsListRoute />
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
					path="/system/queue-observability"
					preload={preloadRoutes(SystemQueueObservabilityRoute)}
					component={() => (
						<PermissionGuard permission={Permissions.JobsRead}>
							<SystemQueueObservabilityRoute />
						</PermissionGuard>
					)}
				/>
				<Route
					path="/system/integrations"
					preload={preloadRoutes(SystemClientIntegrationsRoute)}
					component={() => (
						<PermissionGuard permission={Permissions.IntegrationsRead}>
							<SystemClientIntegrationsRoute />
						</PermissionGuard>
					)}
				/>
				<Route
					path="/system/license"
					preload={preloadRoutes(SystemLicenseRoute)}
					component={() => (
						<PermissionGuard permission={Permissions.LicenseUpdate}>
							<SystemLicenseRoute />
						</PermissionGuard>
					)}
				/>
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
