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

	// Phase 5: Database env vars
	it("constructs correct URL for listDatabaseEnvs", async () => {
		mockFetch(new Response("[]", { status: 200 }));
		await client.listDatabaseEnvs("db-1");
		const [url] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/databases/db-1/envs");
	});

	it("uses POST for createDatabaseEnv", async () => {
		mockFetch(new Response('{"uuid":"env-new"}', { status: 200 }));
		await client.createDatabaseEnv("db-1", { key: "PG_PASS", value: "secret" });
		const [url, options] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/databases/db-1/envs");
		expect(options.method).toBe("POST");
	});

	it("uses PATCH for updateDatabaseEnvsBulk with { data } wrapping", async () => {
		mockFetch(new Response("[]", { status: 200 }));
		await client.updateDatabaseEnvsBulk("db-1", [{ key: "A", value: "1" }]);
		const [url, options] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/databases/db-1/envs/bulk");
		expect(options.method).toBe("PATCH");
		expect(JSON.parse(options.body as string)).toEqual({ data: [{ key: "A", value: "1" }] });
	});

	it("uses DELETE for deleteDatabaseEnv", async () => {
		mockFetch(new Response('{"message":"deleted"}', { status: 200 }));
		await client.deleteDatabaseEnv("db-1", "env-uuid");
		const [url, options] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/databases/db-1/envs/env-uuid");
		expect(options.method).toBe("DELETE");
	});

	// Phase 5: Logs
	it("passes lines parameter to getDatabaseLogs", async () => {
		mockFetch(new Response('"log line"', { status: 200 }));
		await client.getDatabaseLogs("db-1", 200);
		const [url] = fetchCalls[0];
		expect(url).toContain("/databases/db-1/logs?lines=200");
	});

	it("passes lines parameter to getServiceLogs", async () => {
		mockFetch(new Response('"log line"', { status: 200 }));
		await client.getServiceLogs("svc-1", 300);
		const [url] = fetchCalls[0];
		expect(url).toContain("/services/svc-1/logs?lines=300");
	});

	// Deployment history
	it("constructs correct URL for listApplicationDeployments with pagination", async () => {
		mockFetch(new Response('{"count":5,"deployments":[]}', { status: 200 }));
		await client.listApplicationDeployments("app-1", 10, 20);
		const [url] = fetchCalls[0];
		expect(url).toBe(
			"https://coolify.example.com/api/v1/deployments/applications/app-1?skip=10&take=20",
		);
	});

	// Phase 5: Backup management
	it("uses POST for createDatabaseBackup", async () => {
		mockFetch(new Response('{"message":"ok"}', { status: 200 }));
		await client.createDatabaseBackup("db-1");
		const [url, options] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/databases/db-1/backups");
		expect(options.method).toBe("POST");
	});

	it("uses DELETE for deleteDatabaseBackup with UUID", async () => {
		mockFetch(new Response('{"message":"deleted"}', { status: 200 }));
		await client.deleteDatabaseBackup("db-1", "backup-uuid-1");
		const [url, options] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/databases/db-1/backups/backup-uuid-1");
		expect(options.method).toBe("DELETE");
	});

	it("appends delete_s3 query param for deleteDatabaseBackup", async () => {
		mockFetch(new Response('{"message":"deleted"}', { status: 200 }));
		await client.deleteDatabaseBackup("db-1", "backup-uuid-1", { delete_s3: true });
		const [url] = fetchCalls[0];
		expect(url).toBe(
			"https://coolify.example.com/api/v1/databases/db-1/backups/backup-uuid-1?delete_s3=true",
		);
	});

	// Batch 1: docker_cleanup on stop
	it("appends docker_cleanup query param for stopApplication", async () => {
		mockFetch(new Response('{"message":"ok"}', { status: 200 }));
		await client.stopApplication("app-1", { docker_cleanup: true });
		const [url, options] = fetchCalls[0];
		expect(url).toBe(
			"https://coolify.example.com/api/v1/applications/app-1/stop?docker_cleanup=true",
		);
		expect(options.method).toBe("POST");
	});

	it("does not append docker_cleanup when undefined for stopApplication", async () => {
		mockFetch(new Response('{"message":"ok"}', { status: 200 }));
		await client.stopApplication("app-1");
		const [url] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/applications/app-1/stop");
	});

	it("appends docker_cleanup query param for stopDatabase", async () => {
		mockFetch(new Response('{"message":"ok"}', { status: 200 }));
		await client.stopDatabase("db-1", { docker_cleanup: false });
		const [url] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/databases/db-1/stop?docker_cleanup=false");
	});

	it("appends docker_cleanup query param for stopService", async () => {
		mockFetch(new Response('{"message":"ok"}', { status: 200 }));
		await client.stopService("svc-1", { docker_cleanup: true });
		const [url] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/services/svc-1/stop?docker_cleanup=true");
	});

	// Batch 1: force on server delete
	it("appends force query param for deleteServer", async () => {
		mockFetch(new Response('{"message":"deleted"}', { status: 200 }));
		await client.deleteServer("srv-1", { force: true });
		const [url] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/servers/srv-1?force=true");
	});

	// Application Scheduled Tasks
	it("constructs correct URL for listApplicationScheduledTasks", async () => {
		mockFetch(new Response("[]", { status: 200 }));
		await client.listApplicationScheduledTasks("app-1");
		const [url] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/applications/app-1/scheduled-tasks");
	});

	it("uses POST for createApplicationScheduledTask", async () => {
		mockFetch(new Response('{"uuid":"task-1"}', { status: 200 }));
		await client.createApplicationScheduledTask("app-1", {
			name: "cleanup",
			command: "rm -rf /tmp/*",
			frequency: "0 * * * *",
		});
		const [url, options] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/applications/app-1/scheduled-tasks");
		expect(options.method).toBe("POST");
		const body = JSON.parse(options.body as string);
		expect(body.name).toBe("cleanup");
		expect(body.command).toBe("rm -rf /tmp/*");
		expect(body.frequency).toBe("0 * * * *");
	});

	it("uses PATCH for updateApplicationScheduledTask", async () => {
		mockFetch(new Response('{"uuid":"task-1"}', { status: 200 }));
		await client.updateApplicationScheduledTask("app-1", "task-1", { enabled: false });
		const [url, options] = fetchCalls[0];
		expect(url).toBe(
			"https://coolify.example.com/api/v1/applications/app-1/scheduled-tasks/task-1",
		);
		expect(options.method).toBe("PATCH");
	});

	it("uses DELETE for deleteApplicationScheduledTask", async () => {
		mockFetch(new Response('{"message":"deleted"}', { status: 200 }));
		await client.deleteApplicationScheduledTask("app-1", "task-1");
		const [url, options] = fetchCalls[0];
		expect(url).toBe(
			"https://coolify.example.com/api/v1/applications/app-1/scheduled-tasks/task-1",
		);
		expect(options.method).toBe("DELETE");
	});

	it("constructs correct URL for listApplicationScheduledTaskExecutions", async () => {
		mockFetch(new Response("[]", { status: 200 }));
		await client.listApplicationScheduledTaskExecutions("app-1", "task-1");
		const [url] = fetchCalls[0];
		expect(url).toBe(
			"https://coolify.example.com/api/v1/applications/app-1/scheduled-tasks/task-1/executions",
		);
	});

	// Service Scheduled Tasks
	it("constructs correct URL for listServiceScheduledTasks", async () => {
		mockFetch(new Response("[]", { status: 200 }));
		await client.listServiceScheduledTasks("svc-1");
		const [url] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/services/svc-1/scheduled-tasks");
	});

	it("uses DELETE for deleteServiceScheduledTask", async () => {
		mockFetch(new Response('{"message":"deleted"}', { status: 200 }));
		await client.deleteServiceScheduledTask("svc-1", "task-1");
		const [url, options] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/services/svc-1/scheduled-tasks/task-1");
		expect(options.method).toBe("DELETE");
	});

	// Application Storages
	it("constructs correct URL for listApplicationStorages", async () => {
		mockFetch(new Response("[]", { status: 200 }));
		await client.listApplicationStorages("app-1");
		const [url] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/applications/app-1/storages");
	});

	it("uses POST for createApplicationStorage", async () => {
		mockFetch(new Response('{"uuid":"stor-1"}', { status: 200 }));
		await client.createApplicationStorage("app-1", { name: "data", mount_path: "/data" });
		const [url, options] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/applications/app-1/storages");
		expect(options.method).toBe("POST");
	});

	it("uses PATCH for updateApplicationStorage (no storage UUID in path)", async () => {
		mockFetch(new Response('{"uuid":"stor-1"}', { status: 200 }));
		await client.updateApplicationStorage("app-1", { name: "data-v2" });
		const [url, options] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/applications/app-1/storages");
		expect(options.method).toBe("PATCH");
	});

	it("uses DELETE for deleteApplicationStorage with storage UUID in path", async () => {
		mockFetch(new Response('{"message":"deleted"}', { status: 200 }));
		await client.deleteApplicationStorage("app-1", "stor-1");
		const [url, options] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/applications/app-1/storages/stor-1");
		expect(options.method).toBe("DELETE");
	});

	// Database Storages
	it("constructs correct URL for listDatabaseStorages", async () => {
		mockFetch(new Response("[]", { status: 200 }));
		await client.listDatabaseStorages("db-1");
		const [url] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/databases/db-1/storages");
	});

	it("uses DELETE for deleteDatabaseStorage", async () => {
		mockFetch(new Response('{"message":"deleted"}', { status: 200 }));
		await client.deleteDatabaseStorage("db-1", "stor-1");
		const [url, options] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/databases/db-1/storages/stor-1");
		expect(options.method).toBe("DELETE");
	});

	// Service Storages
	it("constructs correct URL for listServiceStorages", async () => {
		mockFetch(new Response("[]", { status: 200 }));
		await client.listServiceStorages("svc-1");
		const [url] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/services/svc-1/storages");
	});

	// GitHub Apps
	it("constructs correct URL for listGitHubApps", async () => {
		mockFetch(new Response("[]", { status: 200 }));
		await client.listGitHubApps();
		const [url] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/github-apps");
	});

	it("uses POST for createGitHubApp", async () => {
		mockFetch(new Response('{"id":1}', { status: 200 }));
		await client.createGitHubApp({ name: "my-app" });
		const [url, options] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/github-apps");
		expect(options.method).toBe("POST");
	});

	it("uses PATCH for updateGitHubApp with numeric id", async () => {
		mockFetch(new Response('{"id":1}', { status: 200 }));
		await client.updateGitHubApp(42, { name: "updated" });
		const [url, options] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/github-apps/42");
		expect(options.method).toBe("PATCH");
	});

	it("uses DELETE for deleteGitHubApp", async () => {
		mockFetch(new Response('{"message":"deleted"}', { status: 200 }));
		await client.deleteGitHubApp(42);
		const [url, options] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/github-apps/42");
		expect(options.method).toBe("DELETE");
	});

	it("constructs correct URL for listGitHubAppRepositories", async () => {
		mockFetch(new Response("[]", { status: 200 }));
		await client.listGitHubAppRepositories(5);
		const [url] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/github-apps/5/repositories");
	});

	it("constructs correct URL for listGitHubAppBranches", async () => {
		mockFetch(new Response("[]", { status: 200 }));
		await client.listGitHubAppBranches(5, "octocat", "hello-world");
		const [url] = fetchCalls[0];
		expect(url).toBe(
			"https://coolify.example.com/api/v1/github-apps/5/repositories/octocat/hello-world/branches",
		);
	});

	// Backup Executions
	it("constructs correct URL for listBackupExecutions", async () => {
		mockFetch(new Response("[]", { status: 200 }));
		await client.listBackupExecutions("db-1", "backup-1");
		const [url] = fetchCalls[0];
		expect(url).toBe(
			"https://coolify.example.com/api/v1/databases/db-1/backups/backup-1/executions",
		);
	});

	it("uses DELETE for deleteBackupExecution", async () => {
		mockFetch(new Response('{"message":"deleted"}', { status: 200 }));
		await client.deleteBackupExecution("db-1", "backup-1", "exec-1");
		const [url, options] = fetchCalls[0];
		expect(url).toBe(
			"https://coolify.example.com/api/v1/databases/db-1/backups/backup-1/executions/exec-1",
		);
		expect(options.method).toBe("DELETE");
	});

	// Backup Schedule Update
	it("uses PATCH for updateDatabaseBackup", async () => {
		mockFetch(new Response('{"uuid":"backup-1"}', { status: 200 }));
		await client.updateDatabaseBackup("db-1", "backup-1", { enabled: false });
		const [url, options] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/databases/db-1/backups/backup-1");
		expect(options.method).toBe("PATCH");
	});

	// Resources listing
	it("constructs correct URL for listResources", async () => {
		mockFetch(new Response("[]", { status: 200 }));
		await client.listResources();
		const [url] = fetchCalls[0];
		expect(url).toBe("https://coolify.example.com/api/v1/resources");
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
