import { describe, expect, it } from "bun:test";
import {
	type Application,
	type Deployment,
	type ServerInfo,
	toApplicationSummary,
	toDeploymentSummary,
	toServerSummary,
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
