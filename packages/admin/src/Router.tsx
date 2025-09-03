import type { Component } from "solid-js";
import { Router, Route } from "@solidjs/router";
import AuthRoutes from "@/layouts/AuthRoutes";
import MainLayout from "@/layouts/Main";
// Routes
import ComponentsRoute from "@/routes/Components";
import LoginRoute from "@/routes/Login";
import SetupRoute from "@/routes/Setup";
import ForgotPasswordRoute from "@/routes/ForgotPassword";
import ResetPasswordRoute from "@/routes/ResetPassword";
import DashboardRoute from "@/routes/Dashboard";
import MediaListRoute from "@/routes/Media/List";
import UsersListRoute from "@/routes/Users/List";
import RolesListRoute from "@/routes/Roles/List";
import SettingsGeneralRoute from "@/routes/Settings/General";
import SettingsClientIntegrationRoute from "@/routes/Settings/ClientIntegration";
import SettingsLicenseRoute from "@/routes/Settings/License";
import EmailListRoute from "@/routes/Emails/List";
import AccountRoute from "@/routes/Account";
import CollectionsListRoute from "@/routes/Collections/List";
import CollectionsDocumentsListRoute from "./routes/Collections/Documents/List";
import CollectionDocumentPageBuilderRoute from "./routes/Collections/Documents/PageBuilder";
import CollectionsDocumentsRevisionsRoute from "./routes/Collections/Documents/Revisions";

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
