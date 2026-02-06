import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { CoolifyClient } from "./client";
import { CoolifyApiError, NetworkError } from "./lib/errors";

const testConfig = {
	coolifyApiUrl: "https://coolify.example.com/api/v1",
	coolifyToken: "test-token-123",
	timeout: 5000,
	debug: false,
	readonly: false,
	requireConfirm: false,
};

describe("CoolifyClient", () => {
	let client: CoolifyClient;
	let originalFetch: typeof globalThis.fetch;

	beforeEach(() => {
		client = new CoolifyClient(testConfig);
		originalFetch = globalThis.fetch;
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	let fetchCalls: Array<[string, RequestInit]>;

	function mockFetch(response: Response) {
		fetchCalls = [];
		globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
			fetchCalls.push([input as string, init as RequestInit]);
			return response;
		}) as typeof fetch;
	}

	function mockFetchReject(error: Error) {
		fetchCalls = [];
		globalThis.fetch = (async () => {
			throw error;
		}) as unknown as typeof fetch;
	}

	it("sends correct Authorization header", async () => {
		mockFetch(new Response("[]", { status: 200 }));

		await client.listApplications();

		expect(fetchCalls).toHaveLength(1);
		const [url, options] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/applications");
		expect((options.headers as Record<string, string>).Authorization).toBe("Bearer test-token-123");
		expect((options.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
		expect((options.headers as Record<string, string>).Accept).toBe("application/json");
	});

	it("constructs correct URL for getApplication", async () => {
		mockFetch(new Response('{"uuid":"abc"}', { status: 200 }));

		await client.getApplication("abc-123");

		const [url] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/applications/abc-123");
	});

	it("constructs correct URL for triggerDeploy with force", async () => {
		mockFetch(new Response('{"deployments":[]}', { status: 200 }));

		await client.triggerDeploy("app-uuid", true);

		const [url] = fetchCalls[0];
		expect(url.includes("/deploy?")).toBe(true);
		expect(url.includes("uuid=app-uuid")).toBe(true);
		expect(url.includes("force=true")).toBe(true);
	});

	it("throws CoolifyApiError on 401", async () => {
		mockFetch(new Response("Unauthorized", { status: 401, statusText: "Unauthorized" }));

		try {
			await client.listApplications();
			expect(true).toBe(false); // should not reach
		} catch (err) {
			expect(err).toBeInstanceOf(CoolifyApiError);
			expect((err as CoolifyApiError).statusCode).toBe(401);
		}
	});

	it("throws CoolifyApiError on 404", async () => {
		mockFetch(new Response("Not found", { status: 404, statusText: "Not Found" }));

		try {
			await client.getApplication("bad-uuid");
			expect(true).toBe(false);
		} catch (err) {
			expect(err).toBeInstanceOf(CoolifyApiError);
			expect((err as CoolifyApiError).statusCode).toBe(404);
		}
	});

	it("uses POST for startApplication and returns response", async () => {
		mockFetch(new Response('{"message":"Starting application."}', { status: 200 }));

		const result = await client.startApplication("uuid");

		const [, options] = fetchCalls[0];
		expect(options.method).toBe("POST");
		expect(result.message).toBe("Starting application.");
	});

	it("passes lines parameter to getApplicationLogs", async () => {
		mockFetch(new Response('"log line 1\\nlog line 2"', { status: 200 }));

		await client.getApplicationLogs("uuid", 500);

		const [url] = fetchCalls[0];
		expect(url.includes("logs?lines=500")).toBe(true);
	});

	it("throws NetworkError on fetch failure", async () => {
		mockFetchReject(new TypeError("Failed to fetch"));

		try {
			await client.listApplications();
			expect(true).toBe(false);
		} catch (err) {
			expect(err).toBeInstanceOf(NetworkError);
			expect((err as NetworkError).message).toContain("Network error");
		}
	});

	it("throws NetworkError on abort (timeout)", async () => {
		const abortError = new DOMException("The operation was aborted", "AbortError");
		mockFetchReject(abortError);

		try {
			await client.listApplications();
			expect(true).toBe(false);
		} catch (err) {
			expect(err).toBeInstanceOf(NetworkError);
			expect((err as NetworkError).message).toBe("Request timeout");
		}
	});

	// Phase 4: Private Keys
	it("constructs correct URL for listPrivateKeys", async () => {
		mockFetch(new Response("[]", { status: 200 }));
		await client.listPrivateKeys();
		const [url] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/security/keys");
	});

	it("constructs correct URL for getPrivateKey", async () => {
		mockFetch(new Response('{"uuid":"pk-1"}', { status: 200 }));
		await client.getPrivateKey("pk-1");
		const [url] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/security/keys/pk-1");
	});

	it("uses POST for createPrivateKey", async () => {
		mockFetch(new Response('{"uuid":"pk-new"}', { status: 200 }));
		await client.createPrivateKey({ name: "test", private_key: "---key---" });
		const [url, options] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/security/keys");
		expect(options.method).toBe("POST");
	});

	// Phase 4: Server CRUD
	it("uses POST for createServer", async () => {
		mockFetch(new Response('{"uuid":"srv-new"}', { status: 200 }));
		await client.createServer({ name: "test", ip: "1.2.3.4", private_key_uuid: "pk-1" });
		const [url, options] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/servers");
		expect(options.method).toBe("POST");
	});

	it("uses DELETE for deleteServer", async () => {
		mockFetch(new Response('{"message":"deleted"}', { status: 200 }));
		await client.deleteServer("srv-1");
		const [url, options] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/servers/srv-1");
		expect(options.method).toBe("DELETE");
	});

	// Phase 4: Environment CRUD
	it("uses POST for createEnvironment", async () => {
		mockFetch(new Response('{"uuid":"env-new"}', { status: 200 }));
		await client.createEnvironment("proj-1", { name: "staging" });
		const [url, options] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/projects/proj-1/environments");
		expect(options.method).toBe("POST");
	});

	it("uses DELETE for deleteEnvironment", async () => {
		mockFetch(new Response('{"message":"deleted"}', { status: 200 }));
		await client.deleteEnvironment("proj-1", "staging");
		const [url, options] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/projects/proj-1/environments/staging");
		expect(options.method).toBe("DELETE");
	});

	// Phase 4: Service env vars
	it("constructs correct URL for listServiceEnvs", async () => {
		mockFetch(new Response("[]", { status: 200 }));
		await client.listServiceEnvs("svc-1");
		const [url] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/services/svc-1/envs");
	});

	it("uses DELETE for deleteServiceEnv", async () => {
		mockFetch(new Response('{"message":"deleted"}', { status: 200 }));
		await client.deleteServiceEnv("svc-1", "env-uuid");
		const [url, options] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/services/svc-1/envs/env-uuid");
		expect(options.method).toBe("DELETE");
	});

	it("parses JSON response correctly", async () => {
		const apps = [
			{
				uuid: "a1",
				name: "test-app",
				status: "running:healthy",
				created_at: "2024-01-01",
				updated_at: "2024-01-01",
			},
		];
		mockFetch(new Response(JSON.stringify(apps), { status: 200 }));

		const result = await client.listApplications();
		expect(result).toEqual(apps);
	});
});
