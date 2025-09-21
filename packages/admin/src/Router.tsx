import { type Component, lazy } from "solid-js";
import { Router, Route } from "@solidjs/router";
import AuthRoutes from "@/layouts/AuthRoutes";
import MainLayout from "@/layouts/Main";
// Routes
const ComponentsRoute = lazy(() => import("@/routes/Components"));
const LoginRoute = lazy(() => import("@/routes/Login"));
const SetupRoute = lazy(() => import("@/routes/Setup"));
const ForgotPasswordRoute = lazy(() => import("@/routes/ForgotPassword"));
const ResetPasswordRoute = lazy(() => import("@/routes/ResetPassword"));
const DashboardRoute = lazy(() => import("@/routes/Dashboard"));
const MediaListRoute = lazy(() => import("@/routes/Media/List"));
const UsersListRoute = lazy(() => import("@/routes/Users/List"));
const RolesListRoute = lazy(() => import("@/routes/Roles/List"));
const SettingsGeneralRoute = lazy(() => import("@/routes/Settings/General"));
const SettingsClientIntegrationRoute = lazy(
	() => import("@/routes/Settings/ClientIntegration"),
);
const SettingsLicenseRoute = lazy(() => import("@/routes/Settings/License"));
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
				<Route path="/collections" component={CollectionsListRoute} />
				<Route
					path="/collections/:collectionKey"
					component={CollectionsDocumentsListRoute}
				/>
				{/* Page builder */}
				<Route
					path="/collections/:collectionKey/draft/create"
					component={() => (
						<CollectionDocumentPageBuilderRoute mode="create" version="draft" />
					)}
				/>
				<Route
					path="/collections/:collectionKey/published/create"
					component={() => (
						<CollectionDocumentPageBuilderRoute
							mode="create"
							version="published"
						/>
					)}
				/>
				<Route
					path="/collections/:collectionKey/draft/:documentId"
					component={() => (
						<CollectionDocumentPageBuilderRoute mode="edit" version="draft" />
					)}
				/>
				<Route
					path="/collections/:collectionKey/published/:documentId"
					component={() => (
						<CollectionDocumentPageBuilderRoute
							mode="edit"
							version="published"
						/>
					)}
				/>
				<Route
					path="/collections/:collectionKey/revisions/:documentId/:versionId"
					component={() => <CollectionsDocumentsRevisionsRoute />}
				/>
				{/* Media */}
				<Route path="/media" component={MediaListRoute} />
				<Route path="/media/:folderId" component={MediaListRoute} />
				{/* Users */}
				<Route path="/users" component={UsersListRoute} />
				{/* Roles */}
				<Route path="/roles" component={RolesListRoute} />
				{/* Emails */}
				<Route path="/emails" component={EmailListRoute} />
				{/* Settings */}
				<Route path="/settings" component={SettingsGeneralRoute} />
				<Route
					path="/settings/client-integrations"
					component={SettingsClientIntegrationRoute}
				/>
				<Route path="/settings/license" component={SettingsLicenseRoute} />
			</Route>
			{/* Non authenticated */}
			<Route path="/admin" component={AuthRoutes}>
				<Route path="/login" component={LoginRoute} />
				<Route path="/setup" component={SetupRoute} />
				<Route path="/forgot-password" component={ForgotPasswordRoute} />
				<Route path="/reset-password" component={ResetPasswordRoute} />
			</Route>
		</Router>
	);
};

export default AppRouter;
