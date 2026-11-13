import { describe, expect, test } from "vitest";
import isLocalHost from "./is-local-host.js";

const hostname = (url: string) => new URL(url).hostname;

describe("isLocalHost", () => {
	test("treats localhost names and loopback addresses as local, and nothing else", () => {
		const local = [
			"http://localhost/",
			"http://localhost./",
			"http://site.localhost/",
			"http://127.0.0.1/",
			"http://127.0.0.2/",
			"http://127.255.255.254/",
			"http://[::1]/",
			"http://[::ffff:127.0.0.1]/",
		];
		const remote = [
			"https://example.com/",
			"https://example.com./",
			"http://128.0.0.1/",
			"http://[::ffff:8.8.8.8]/",
			"http://127.example.com/",
		];

		expect(local.filter((url) => !isLocalHost(hostname(url)))).toEqual([]);
		expect(remote.filter((url) => isLocalHost(hostname(url)))).toEqual([]);
	});
});
