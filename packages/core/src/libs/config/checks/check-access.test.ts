import { describe, expect, test } from "vitest";
import type { Config } from "../../../types/config.js";
import { Permissions } from "../../permission/definitions.js";
import checkAccess from "./check-access.js";

const buildConfig = (access: Config["access"]) =>
	({
		access,
		collections: [],
	}) as Config;

describe("checkAccess", () => {
	test("accepts roles that reference nested group permissions", () => {
		expect(() =>
			checkAccess(
				buildConfig({
					groups: {
						pages: {
							name: "Page Permissions",
							permissions: {
								"page:read": {
									name: "Read Pages",
								},
							},
						},
					},
					roles: [
						{
							key: "editor",
							name: "Editor",
							permissions: [Permissions.UsersRead, "page:read"],
						},
					],
				}),
			),
		).not.toThrow();
	});

	test("rejects duplicate nested permission keys", () => {
		expect(() =>
			checkAccess(
				buildConfig({
					groups: {
						pages: {
							name: "Page Permissions",
							permissions: {
								"content:read": {
									name: "Read Pages",
								},
							},
						},
						blogs: {
							name: "Blog Permissions",
							permissions: {
								"content:read": {
									name: "Read Blogs",
								},
							},
						},
					},
					roles: [],
				}),
			),
		).toThrow(/access\.groups permissions/);
	});

	test("rejects roles that reference unknown permissions", () => {
		expect(() =>
			checkAccess(
				buildConfig({
					groups: {},
					roles: [
						{
							key: "editor",
							name: "Editor",
							permissions: ["page:read"],
						},
					],
				}),
			),
		).toThrow(/unknown permission/);
	});
});
