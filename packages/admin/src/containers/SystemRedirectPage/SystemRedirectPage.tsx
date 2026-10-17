import { Navigate } from "@solidjs/router";
import type { Component } from "solid-js";
import { Permissions } from "@/constants/permissions";
import userStore from "@/store/userStore/userStore";

const SystemRedirectPage: Component = () => {
	// ----------------------------------
	// Render
	if (userStore.get.hasPermission([Permissions.SettingsRead]).all) {
		return <Navigate href="/admin/system/overview" />;
	}

	if (userStore.get.hasPermission([Permissions.IntegrationsRead]).all) {
		return <Navigate href="/admin/system/integrations" />;
	}

	if (userStore.get.hasPermission([Permissions.ConnectionUpdate]).all) {
		return <Navigate href="/admin/system/integrations" />;
	}

	if (userStore.get.hasPermission([Permissions.JobsRead]).all) {
		return <Navigate href="/admin/system/jobs" />;
	}

	return <Navigate href="/admin" />;
};

export default SystemRedirectPage;
