import { describe, expect, it } from "bun:test";
import {
	type Application,
	type Database,
	type Deployment,
	type Environment,
	type GitHubApp,
	type PrivateKey,
	type Project,
	type ScheduledTask,
	type ServerInfo,
	type Service,
	type Storage,
	type Team,
	toApplicationSummary,
	toDatabaseSummary,
	toDeploymentSummary,
	toEnvironmentSummary,
	toGitHubAppSummary,
	toPrivateKeySummary,
	toProjectSummary,
	toScheduledTaskSummary,
	toServerSummary,
	toServiceSummary,
	toStorageSummary,
	toTeamSummary,
} from "./api";

describe("toApplicationSummary", () => {
	const app: Application = {
		uuid: "app-001",
		name: "web-app",
		description: "A web application",
		fqdn: "https://app.example.com",
		status: "running:healthy",
		git_repository: "https://github.com/org/repo",
		git_branch: "main",
		build_pack: "dockerfile",
		created_at: "2024-01-01T00:00:00Z",
		updated_at: "2024-06-15T00:00:00Z",
	};

	it("extracts summary fields", () => {
		const summary = toApplicationSummary(app);
		expect(summary.uuid).toBe("app-001");
		expect(summary.name).toBe("web-app");
		expect(summary.status).toBe("running:healthy");
		expect(summary.fqdn).toBe("https://app.example.com");
		expect(summary.git_repository).toBe("https://github.com/org/repo");
		expect(summary.git_branch).toBe("main");
	});

	it("excludes detail fields", () => {
		const summary = toApplicationSummary(app);
		expect("description" in summary).toBe(false);
		expect("build_pack" in summary).toBe(false);
		expect("created_at" in summary).toBe(false);
		expect("updated_at" in summary).toBe(false);
	});
});

describe("toDeploymentSummary", () => {
	const dep: Deployment = {
		deployment_uuid: "dep-001",
		application_id: 42,
		status: "finished",
		commit: "abc1234",
		commit_message: "fix bug",
		finished_at: "2024-06-15T10:05:00Z",
		created_at: "2024-06-15T10:00:00Z",
	};

	it("extracts summary fields", () => {
		const summary = toDeploymentSummary(dep);
		expect(summary.deployment_uuid).toBe("dep-001");
		expect(summary.application_id).toBe(42);
		expect(summary.status).toBe("finished");
		expect(summary.commit).toBe("abc1234");
		expect(summary.created_at).toBe("2024-06-15T10:00:00Z");
	});

	it("excludes detail fields", () => {
		const summary = toDeploymentSummary(dep);
		expect("commit_message" in summary).toBe(false);
		expect("finished_at" in summary).toBe(false);
	});
});

describe("toServerSummary", () => {
	const server: ServerInfo = {
		id: 1,
		uuid: "srv-001",
		name: "prod-server",
		ip: "10.0.0.1",
		user: "root",
		port: 22,
		created_at: "2024-01-01T00:00:00Z",
		updated_at: "2024-06-15T00:00:00Z",
	};

	it("extracts summary fields", () => {
		const summary = toServerSummary(server);
		expect(summary.uuid).toBe("srv-001");
		expect(summary.name).toBe("prod-server");
		expect(summary.ip).toBe("10.0.0.1");
	});

	it("excludes detail fields", () => {
		const summary = toServerSummary(server);
		expect("id" in summary).toBe(false);
		expect("user" in summary).toBe(false);
		expect("port" in summary).toBe(false);
		expect("created_at" in summary).toBe(false);
	});
});

describe("toDatabaseSummary", () => {
	const db: Database = {
		uuid: "db-001",
		name: "prod-postgres",
		database_type: "standalone-postgresql",
		status: "running",
		destination_id: 1,
		environment_id: 1,
		created_at: "2024-01-01T00:00:00Z",
		updated_at: "2024-06-15T00:00:00Z",
	};

	it("extracts summary fields", () => {
		const summary = toDatabaseSummary(db);
		expect(summary.uuid).toBe("db-001");
		expect(summary.name).toBe("prod-postgres");
		expect(summary.database_type).toBe("standalone-postgresql");
		expect(summary.status).toBe("running");
	});

	it("excludes detail fields", () => {
		const summary = toDatabaseSummary(db);
		expect("destination_id" in summary).toBe(false);
		expect("environment_id" in summary).toBe(false);
		expect("created_at" in summary).toBe(false);
	});
});

describe("toServiceSummary", () => {
	const svc: Service = {
		uuid: "svc-001",
		name: "redis-cache",
		status: "running",
		service_type: "redis",
		destination_id: 1,
		environment_id: 1,
		created_at: "2024-01-01T00:00:00Z",
		updated_at: "2024-06-15T00:00:00Z",
	};

	it("extracts summary fields", () => {
		const summary = toServiceSummary(svc);
		expect(summary.uuid).toBe("svc-001");
		expect(summary.name).toBe("redis-cache");
		expect(summary.status).toBe("running");
		expect(summary.service_type).toBe("redis");
	});

	it("excludes detail fields", () => {
		const summary = toServiceSummary(svc);
		expect("destination_id" in summary).toBe(false);
		expect("environment_id" in summary).toBe(false);
		expect("created_at" in summary).toBe(false);
	});
});

describe("toProjectSummary", () => {
	const proj: Project = {
		id: 1,
		uuid: "proj-001",
		name: "my-project",
		description: "A project",
	};

	it("extracts summary fields", () => {
		const summary = toProjectSummary(proj);
		expect(summary.uuid).toBe("proj-001");
		expect(summary.name).toBe("my-project");
		expect(summary.description).toBe("A project");
	});

	it("excludes detail fields", () => {
		const summary = toProjectSummary(proj);
		expect("id" in summary).toBe(false);
	});
});

describe("toEnvironmentSummary", () => {
	const env: Environment = {
		id: 1,
		uuid: "env-uuid-123",
		name: "production",
		project_id: 5,
		description: "Prod env",
		created_at: "2024-01-01T00:00:00Z",
		updated_at: "2024-06-15T00:00:00Z",
	};

	it("extracts summary fields", () => {
		const summary = toEnvironmentSummary(env);
		expect(summary.uuid).toBe("env-uuid-123");
		expect(summary.name).toBe("production");
	});

	it("excludes detail fields", () => {
		const summary = toEnvironmentSummary(env);
		expect("id" in summary).toBe(false);
		expect("created_at" in summary).toBe(false);
		expect("updated_at" in summary).toBe(false);
	});
});

describe("toTeamSummary", () => {
	const team: Team = {
		id: 1,
		name: "my-team",
		description: "Team description",
		personal_team: false,
		created_at: "2024-01-01T00:00:00Z",
		updated_at: "2024-06-15T00:00:00Z",
	};

	it("extracts summary fields", () => {
		const summary = toTeamSummary(team);
		expect(summary.id).toBe(1);
		expect(summary.name).toBe("my-team");
		expect(summary.description).toBe("Team description");
	});

	it("excludes detail fields", () => {
		const summary = toTeamSummary(team);
		expect("personal_team" in summary).toBe(false);
		expect("created_at" in summary).toBe(false);
		expect("updated_at" in summary).toBe(false);
	});
});

describe("toPrivateKeySummary", () => {
	const key: PrivateKey = {
		id: 1,
		uuid: "pk-001",
		name: "production-key",
		description: "SSH key for prod",
		fingerprint: "SHA256:abc123",
		is_git_related: false,
		created_at: "2024-01-01T00:00:00Z",
		updated_at: "2024-06-15T00:00:00Z",
	};

	it("extracts summary fields", () => {
		const summary = toPrivateKeySummary(key);
		expect(summary.uuid).toBe("pk-001");
		expect(summary.name).toBe("production-key");
		expect(summary.description).toBe("SSH key for prod");
		expect(summary.fingerprint).toBe("SHA256:abc123");
	});

	it("excludes detail fields", () => {
		const summary = toPrivateKeySummary(key);
		expect("id" in summary).toBe(false);
		expect("is_git_related" in summary).toBe(false);
		expect("created_at" in summary).toBe(false);
		expect("updated_at" in summary).toBe(false);
	});
});

describe("toScheduledTaskSummary", () => {
	const task: ScheduledTask = {
		uuid: "task-001",
		name: "cleanup-logs",
		command: "rm -rf /tmp/logs/*",
		frequency: "0 2 * * *",
		container: "app",
		timeout: 300,
		enabled: true,
		created_at: "2024-01-01T00:00:00Z",
		updated_at: "2024-06-15T00:00:00Z",
	};

	it("extracts summary fields", () => {
		const summary = toScheduledTaskSummary(task);
		expect(summary.uuid).toBe("task-001");
		expect(summary.name).toBe("cleanup-logs");
		expect(summary.frequency).toBe("0 2 * * *");
		expect(summary.enabled).toBe(true);
	});

	it("excludes detail fields", () => {
		const summary = toScheduledTaskSummary(task);
		expect("command" in summary).toBe(false);
		expect("container" in summary).toBe(false);
		expect("timeout" in summary).toBe(false);
		expect("created_at" in summary).toBe(false);
	});
});

describe("toStorageSummary", () => {
	const storage: Storage = {
		uuid: "stor-001",
		name: "app-data",
		mount_path: "/data",
		host_path: "/mnt/data",
		content: "some config",
		created_at: "2024-01-01T00:00:00Z",
		updated_at: "2024-06-15T00:00:00Z",
	};

	it("extracts summary fields", () => {
		const summary = toStorageSummary(storage);
		expect(summary.uuid).toBe("stor-001");
		expect(summary.name).toBe("app-data");
		expect(summary.mount_path).toBe("/data");
		expect(summary.host_path).toBe("/mnt/data");
	});

	it("excludes detail fields", () => {
		const summary = toStorageSummary(storage);
		expect("content" in summary).toBe(false);
		expect("created_at" in summary).toBe(false);
		expect("updated_at" in summary).toBe(false);
	});
});

describe("toGitHubAppSummary", () => {
	const app: GitHubApp = {
		id: 42,
		uuid: "gh-001",
		name: "my-github-app",
		organization_id: 1,
		app_id: 12345,
		installation_id: 67890,
		html_url: "https://github.com/apps/my-app",
		is_system_wide: false,
		created_at: "2024-01-01T00:00:00Z",
		updated_at: "2024-06-15T00:00:00Z",
	};

	it("extracts summary fields", () => {
		const summary = toGitHubAppSummary(app);
		expect(summary.id).toBe(42);
		expect(summary.uuid).toBe("gh-001");
		expect(summary.name).toBe("my-github-app");
		expect(summary.is_system_wide).toBe(false);
	});

	it("excludes detail fields", () => {
		const summary = toGitHubAppSummary(app);
		expect("organization_id" in summary).toBe(false);
		expect("app_id" in summary).toBe(false);
		expect("installation_id" in summary).toBe(false);
		expect("html_url" in summary).toBe(false);
		expect("created_at" in summary).toBe(false);
	});
});
