import { Route, Router } from "@solidjs/router";
import { type Component, lazy } from "solid-js";
import { Permissions } from "@/constants/permissions";
import PermissionGuard from "@/guards/Permission";
import AuthRoutes from "@/layouts/AuthRoutes";
import MainLayout from "@/layouts/Main";
import PublicRoutes from "@/layouts/PublicRoutes";

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
const SystemOverviewRoute = lazy(() => import("@/routes/System/Overview/View"));
const SystemClientIntegrationsRoute = lazy(
	() => import("@/routes/System/ClientIntegrations/View"),
);
const SystemLicenseRoute = lazy(() => import("@/routes/System/License/View"));
const SystemQueueObservabilityRoute = lazy(
	() => import("@/routes/System/QueueObservability/View"),
);
const EmailListRoute = lazy(() => import("@/routes/Emails/List"));
const PublishRequestsListRoute = lazy(
	() => import("@/routes/PublishRequests/List"),
);
const AccountRoute = lazy(() => import("@/routes/Account"));
const CollectionsListRoute = lazy(() => import("@/routes/Collections/List"));
const CollectionsDocumentsListRoute = lazy(
	() => import("./routes/Collections/Documents/List"),
);
const CollectionDocumentPageBuilderRoute = lazy(
	() => import("./routes/Collections/Documents/PageBuilder"),
);
const CollectionsDocumentsHistoryRoute = lazy(
	() => import("./routes/Collections/Documents/History"),
);
const CollectionsDocumentsPublishRequestsRoute = lazy(
	() => import("./routes/Collections/Documents/PublishRequests"),
);
const CollectionsDocumentsPublishRequestDetailRoute = lazy(
	() => import("./routes/Collections/Documents/PublishRequestDetail"),
);

const AppRouter: Component = () => {
	return (
		<Router>
			{/* Authenticated */}
			<Route path="/lucid" component={MainLayout}>
				<Route path="/" component={DashboardRoute} />
				<Route path="/components" component={ComponentsRoute} />
				<Route path="/account" component={AccountRoute} />
				{/* Collections */}
				<Route path="/collections" component={() => <CollectionsListRoute />} />
				<Route
					path="/collections/:collectionKey"
					component={() => <CollectionsDocumentsListRoute />}
				/>
				{/* Page builder */}
				<Route
					path="/collections/:collectionKey/latest/create"
					component={() => (
						<CollectionDocumentPageBuilderRoute
							mode="create"
							version="latest"
						/>
					)}
				/>
				<Route
					path="/collections/:collectionKey/snapshot/:documentId/:versionId"
					component={() => (
						<CollectionDocumentPageBuilderRoute
							mode="edit"
							version="snapshot"
						/>
					)}
				/>
				<Route
					path="/collections/:collectionKey/:versionType/:documentId"
					component={() => <CollectionDocumentPageBuilderRoute mode="edit" />}
				/>
				<Route
					path="/collections/:collectionKey/revision/:documentId/:versionId"
					component={() => (
						<CollectionDocumentPageBuilderRoute
							mode="edit"
							version="revision"
						/>
					)}
				/>
				<Route
					path="/collections/:collectionKey/:documentId/history"
					component={() => <CollectionsDocumentsHistoryRoute />}
				/>
				<Route
					path="/collections/:collectionKey/:documentId/publish-requests"
					component={() => (
						<PermissionGuard permission={Permissions.DocumentsReview}>
							<CollectionsDocumentsPublishRequestsRoute />
						</PermissionGuard>
					)}
				/>
				<Route
					path="/collections/:collectionKey/:documentId/publish-requests/:publishRequestId"
					component={() => (
						<PermissionGuard permission={Permissions.DocumentsReview}>
							<CollectionsDocumentsPublishRequestDetailRoute />
						</PermissionGuard>
					)}
				/>
				{/* Media */}
				<Route
					path="/media"
					component={() => (
						<PermissionGuard permission={Permissions.MediaRead}>
							<MediaListRoute />
						</PermissionGuard>
					)}
				/>
				<Route
					path="/media/:folderId"
					component={() => (
						<PermissionGuard permission={Permissions.MediaRead}>
							<MediaListRoute />
						</PermissionGuard>
					)}
				/>
				{/* Users */}
				<Route
					path="/users"
					component={() => (
						<PermissionGuard permission={Permissions.UsersRead}>
							<UsersListRoute />
						</PermissionGuard>
					)}
				/>
				{/* Roles */}
				<Route
					path="/roles"
					component={() => (
						<PermissionGuard permission={Permissions.RolesRead}>
							<RolesListRoute />
						</PermissionGuard>
					)}
				/>
				{/* Emails */}
				<Route
					path="/emails"
					component={() => (
						<PermissionGuard permission={Permissions.EmailRead}>
							<EmailListRoute />
						</PermissionGuard>
					)}
				/>
				<Route
					path="/publish-requests"
					component={() => (
						<PermissionGuard permission={Permissions.DocumentsReview}>
							<PublishRequestsListRoute />
						</PermissionGuard>
					)}
				/>
				{/* System */}
				<Route
					path="/system/overview"
					component={() => (
						<PermissionGuard permission={Permissions.SettingsRead}>
							<SystemOverviewRoute />
						</PermissionGuard>
					)}
				/>
				<Route
					path="/system/queue-observability"
					component={() => (
						<PermissionGuard permission={Permissions.JobsRead}>
							<SystemQueueObservabilityRoute />
						</PermissionGuard>
					)}
				/>
				<Route
					path="/system/integrations"
					component={() => (
						<PermissionGuard permission={Permissions.IntegrationsRead}>
							<SystemClientIntegrationsRoute />
						</PermissionGuard>
					)}
				/>
				<Route
					path="/system/license"
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
