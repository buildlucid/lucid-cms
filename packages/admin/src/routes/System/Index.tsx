import { Navigate } from "@solidjs/router";
import type { Component } from "solid-js";
import { Permissions } from "@/constants/permissions";
import userStore from "@/store/userStore";

const SystemIndexRoute: Component = () => {
	if (userStore.get.hasPermission([Permissions.SettingsRead]).all) {
		return <Navigate href="/lucid/system/overview" />;
	}

	if (userStore.get.hasPermission([Permissions.LicenseUpdate]).all) {
		return <Navigate href="/lucid/system/license" />;
	}

	if (userStore.get.hasPermission([Permissions.IntegrationsRead]).all) {
		return <Navigate href="/lucid/system/integrations" />;
	}

	if (userStore.get.hasPermission([Permissions.JobsRead]).all) {
		return <Navigate href="/lucid/system/queue-observability" />;
	}

	return <Navigate href="/lucid" />;
};

export default SystemIndexRoute;
