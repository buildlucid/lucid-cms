import { type Component, lazy } from "solid-js";
import { Router, Route } from "@solidjs/router";
import AuthRoutes from "@/layouts/AuthRoutes";
import MainLayout from "@/layouts/Main";
import PermissionGuard from "@/guards/Permission";
// Routes
const ComponentsRoute = lazy(() => import("@/routes/Components"));
const LoginRoute = lazy(() => import("@/routes/Login"));
const SetupRoute = lazy(() => import("@/routes/Setup"));
const ForgotPasswordRoute = lazy(() => import("@/routes/ForgotPassword"));
const ResetPasswordRoute = lazy(() => import("@/routes/ResetPassword"));
const AcceptInvitationRoute = lazy(() => import("@/routes/AcceptInvitation"));
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
const AccountRoute = lazy(() => import("@/routes/Account"));
const CollectionsListRoute = lazy(() => import("@/routes/Collections/List"));
const CollectionsDocumentsListRoute = lazy(
	() => import("./routes/Collections/Documents/List"),
);
const CollectionDocumentPageBuilderRoute = lazy(
	() => import("./routes/Collections/Documents/PageBuilder"),
);
const CollectionsDocumentsRevisionsRoute = lazy(
	() => import("./routes/Collections/Documents/Revisions"),
);

const AppRouter: Component = () => {
	return (
		<Router>
			{/* Authenticated */}
			<Route path="/admin" component={MainLayout}>
				<Route path="/" component={DashboardRoute} />
				<Route path="/components" component={ComponentsRoute} />
				<Route path="/account" component={AccountRoute} />
				{/* Collections */}
				<Route
					path="/collections"
					component={() => (
						<PermissionGuard permission={"read_content"}>
							<CollectionsListRoute />
						</PermissionGuard>
					)}
				/>
				<Route
					path="/collections/:collectionKey"
					component={() => (
						<PermissionGuard permission={"read_content"}>
							<CollectionsDocumentsListRoute />
						</PermissionGuard>
					)}
				/>
				{/* Page builder */}
				<Route
					path="/collections/:collectionKey/latest/create"
					component={() => (
						<PermissionGuard permission={"read_content"}>
							<CollectionDocumentPageBuilderRoute
								mode="create"
								version="latest"
							/>
						</PermissionGuard>
					)}
				/>
				<Route
					path="/collections/:collectionKey/:versionType/:documentId"
					component={() => (
						<PermissionGuard permission={"read_content"}>
							<CollectionDocumentPageBuilderRoute mode="edit" />
						</PermissionGuard>
					)}
				/>
				<Route
					path="/collections/:collectionKey/revision/:documentId/:versionId"
					component={() => (
						<PermissionGuard permission={"read_content"}>
							<CollectionsDocumentsRevisionsRoute />
						</PermissionGuard>
					)}
				/>
				{/* Media */}
				<Route
					path="/media"
					component={() => (
						<PermissionGuard permission={"read_media"}>
							<MediaListRoute />
						</PermissionGuard>
					)}
				/>
				<Route
					path="/media/:folderId"
					component={() => (
						<PermissionGuard permission={"read_media"}>
							<MediaListRoute />
						</PermissionGuard>
					)}
				/>
				{/* Users */}
				<Route
					path="/users"
					component={() => (
						<PermissionGuard permission={"read_user"}>
							<UsersListRoute />
						</PermissionGuard>
					)}
				/>
				{/* Roles */}
				<Route
					path="/roles"
					component={() => (
						<PermissionGuard permission={"read_role"}>
							<RolesListRoute />
						</PermissionGuard>
					)}
				/>
				{/* Emails */}
				<Route
					path="/emails"
					component={() => (
						<PermissionGuard permission={"read_email"}>
							<EmailListRoute />
						</PermissionGuard>
					)}
				/>
				{/* System */}
				<Route path="/system/overview" component={SystemOverviewRoute} />
				<Route
					path="/system/queue-observability"
					component={() => (
						<PermissionGuard permission={"read_job"}>
							<SystemQueueObservabilityRoute />
						</PermissionGuard>
					)}
				/>
				<Route
					path="/system/client-integrations"
					component={() => (
						<PermissionGuard permission={"read_client_integration"}>
							<SystemClientIntegrationsRoute />
						</PermissionGuard>
					)}
				/>
				<Route
					path="/system/license"
					component={() => (
						<PermissionGuard permission={"update_license"}>
							<SystemLicenseRoute />
						</PermissionGuard>
					)}
				/>
			</Route>
			{/* Non authenticated */}
			<Route path="/admin" component={AuthRoutes}>
				<Route path="/login" component={LoginRoute} />
				<Route path="/setup" component={SetupRoute} />
				<Route path="/forgot-password" component={ForgotPasswordRoute} />
				<Route path="/reset-password" component={ResetPasswordRoute} />
				<Route path="/accept-invitation" component={AcceptInvitationRoute} />
			</Route>
		</Router>
	);
};

export default AppRouter;
