import type { Config } from "./config";
import { CoolifyApiError, NetworkError } from "./lib/errors";
import type {
	Application,
	BackupExecution,
	Database,
	Deployment,
	Environment,
	EnvironmentVariable,
	GitHubApp,
	GitHubBranch,
	GitHubRepository,
	PrivateKey,
	Project,
	ScheduledTask,
	ScheduledTaskExecution,
	ServerInfo,
	Service,
	Storage,
	Team,
	TeamMember,
} from "./types/api";

export class CoolifyClient {
	private baseUrl: string;
	private token: string;
	private timeout: number;
	private debug: boolean;

	constructor(config: Config) {
		this.baseUrl = config.coolifyApiUrl;
		this.token = config.coolifyToken;
		this.timeout = config.timeout;
		this.debug = config.debug;
	}

	private async request<T>(method: string, endpoint: string, body?: object): Promise<T> {
		const url = `${this.baseUrl}${endpoint}`;
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), this.timeout);

		try {
			if (this.debug) {
				console.error(`[DEBUG] ${method} ${url}`);
			}

			const response = await fetch(url, {
				method,
				headers: {
					Authorization: `Bearer ${this.token}`,
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				body: body ? JSON.stringify(body) : undefined,
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				const errorText = await response.text();
				throw new CoolifyApiError(
					`API error: ${response.status} ${response.statusText}`,
					response.status,
					errorText,
				);
			}

			const text = await response.text();
			if (!text) return {} as T;
			try {
				return JSON.parse(text) as T;
			} catch {
				return text as T;
			}
		} catch (error) {
			clearTimeout(timeoutId);
			if (error instanceof CoolifyApiError) throw error;
			if (error instanceof Error && error.name === "AbortError") {
				throw new NetworkError("Request timeout");
			}
			throw new NetworkError(`Network error: ${error}`);
		}
	}

	// Applications
	async listApplications(): Promise<Application[]> {
		return this.request<Application[]>("GET", "/applications");
	}

	async getApplication(uuid: string): Promise<Application> {
		return this.request<Application>("GET", `/applications/${uuid}`);
	}

	async startApplication(uuid: string): Promise<{ message: string; deployment_uuid?: string }> {
		return this.request("POST", `/applications/${uuid}/start`);
	}

	async stopApplication(
		uuid: string,
		opts?: { docker_cleanup?: boolean },
	): Promise<{ message: string }> {
		const params = new URLSearchParams();
		if (opts?.docker_cleanup !== undefined)
			params.set("docker_cleanup", String(opts.docker_cleanup));
		const qs = params.toString();
		return this.request("POST", `/applications/${uuid}/stop${qs ? `?${qs}` : ""}`);
	}

	async restartApplication(uuid: string): Promise<{ message: string; deployment_uuid?: string }> {
		return this.request("POST", `/applications/${uuid}/restart`);
	}

	async updateApplication(uuid: string, data: Record<string, unknown>): Promise<{ uuid: string }> {
		return this.request<{ uuid: string }>("PATCH", `/applications/${uuid}`, data);
	}

	async deleteApplication(
		uuid: string,
		opts?: { delete_volumes?: boolean; docker_cleanup?: boolean },
	): Promise<{ message: string }> {
		const params = new URLSearchParams();
		if (opts?.delete_volumes !== undefined)
			params.set("delete_volumes", String(opts.delete_volumes));
		if (opts?.docker_cleanup !== undefined)
			params.set("docker_cleanup", String(opts.docker_cleanup));
		const qs = params.toString();
		return this.request("DELETE", `/applications/${uuid}${qs ? `?${qs}` : ""}`);
	}

	// Deployments
	async listDeployments(): Promise<Deployment[]> {
		return this.request<Deployment[]>("GET", "/deployments");
	}

	async listApplicationDeployments(
		uuid: string,
		skip = 0,
		take = 10,
	): Promise<{ count: number; deployments: Deployment[] }> {
		return this.request("GET", `/deployments/applications/${uuid}?skip=${skip}&take=${take}`);
	}

	async getDeployment(uuid: string): Promise<Deployment> {
		return this.request<Deployment>("GET", `/deployments/${uuid}`);
	}

	async triggerDeploy(
		uuid: string,
		force = false,
	): Promise<{
		deployments: Array<{ message: string; resource_uuid: string; deployment_uuid: string }>;
	}> {
		const params = new URLSearchParams({ uuid });
		if (force) params.set("force", "true");
		return this.request("GET", `/deploy?${params.toString()}`);
	}

	async cancelDeployment(uuid: string): Promise<{ message: string }> {
		return this.request("POST", `/deployments/${uuid}/cancel`);
	}

	// Logs
	async getApplicationLogs(uuid: string, lines = 100): Promise<string> {
		return this.request<string>("GET", `/applications/${uuid}/logs?lines=${lines}`);
	}

	// Servers
	async listServers(): Promise<ServerInfo[]> {
		return this.request<ServerInfo[]>("GET", "/servers");
	}

	async getServer(uuid: string): Promise<ServerInfo> {
		return this.request<ServerInfo>("GET", `/servers/${uuid}`);
	}

	async validateServer(uuid: string): Promise<{ message: string }> {
		return this.request("GET", `/servers/${uuid}/validate`);
	}

	async getServerResources(uuid: string): Promise<unknown[]> {
		return this.request("GET", `/servers/${uuid}/resources`);
	}

	async getServerDomains(uuid: string): Promise<unknown[]> {
		return this.request("GET", `/servers/${uuid}/domains`);
	}

	async createServer(data: Record<string, unknown>): Promise<{ uuid: string }> {
		return this.request<{ uuid: string }>("POST", "/servers", data);
	}

	async updateServer(uuid: string, data: Record<string, unknown>): Promise<{ uuid: string }> {
		return this.request<{ uuid: string }>("PATCH", `/servers/${uuid}`, data);
	}

	async deleteServer(uuid: string, opts?: { force?: boolean }): Promise<{ message: string }> {
		const params = new URLSearchParams();
		if (opts?.force !== undefined) params.set("force", String(opts.force));
		const qs = params.toString();
		return this.request("DELETE", `/servers/${uuid}${qs ? `?${qs}` : ""}`);
	}

	// Databases
	async listDatabases(): Promise<Database[]> {
		return this.request<Database[]>("GET", "/databases");
	}

	async getDatabase(uuid: string): Promise<Database> {
		return this.request<Database>("GET", `/databases/${uuid}`);
	}

	async deleteDatabase(
		uuid: string,
		opts?: { delete_volumes?: boolean; docker_cleanup?: boolean },
	): Promise<{ message: string }> {
		const params = new URLSearchParams();
		if (opts?.delete_volumes !== undefined)
			params.set("delete_volumes", String(opts.delete_volumes));
		if (opts?.docker_cleanup !== undefined)
			params.set("docker_cleanup", String(opts.docker_cleanup));
		const qs = params.toString();
		return this.request("DELETE", `/databases/${uuid}${qs ? `?${qs}` : ""}`);
	}

	async listDatabaseBackups(uuid: string): Promise<unknown[]> {
		return this.request("GET", `/databases/${uuid}/backups`);
	}

	async startDatabase(uuid: string): Promise<{ message: string }> {
		return this.request("GET", `/databases/${uuid}/start`);
	}

	async stopDatabase(
		uuid: string,
		opts?: { docker_cleanup?: boolean },
	): Promise<{ message: string }> {
		const params = new URLSearchParams();
		if (opts?.docker_cleanup !== undefined)
			params.set("docker_cleanup", String(opts.docker_cleanup));
		const qs = params.toString();
		return this.request("GET", `/databases/${uuid}/stop${qs ? `?${qs}` : ""}`);
	}

	async restartDatabase(uuid: string): Promise<{ message: string }> {
		return this.request("GET", `/databases/${uuid}/restart`);
	}

	async updateDatabase(uuid: string, data: Record<string, unknown>): Promise<Database> {
		return this.request<Database>("PATCH", `/databases/${uuid}`, data);
	}

	// Database Environment Variables
	async listDatabaseEnvs(dbUuid: string): Promise<EnvironmentVariable[]> {
		return this.request<EnvironmentVariable[]>("GET", `/databases/${dbUuid}/envs`);
	}

	async createDatabaseEnv(
		dbUuid: string,
		data: {
			key: string;
			value: string;
			is_preview?: boolean;
			is_literal?: boolean;
			is_multiline?: boolean;
			is_shown_once?: boolean;
			comment?: string;
		},
	): Promise<{ uuid: string }> {
		return this.request("POST", `/databases/${dbUuid}/envs`, data);
	}

	async updateDatabaseEnvsBulk(
		dbUuid: string,
		envs: Array<{
			key: string;
			value: string;
			is_preview?: boolean;
			is_literal?: boolean;
			is_multiline?: boolean;
			is_shown_once?: boolean;
			comment?: string;
		}>,
	): Promise<EnvironmentVariable[]> {
		return this.request("PATCH", `/databases/${dbUuid}/envs/bulk`, { data: envs });
	}

	async deleteDatabaseEnv(dbUuid: string, envUuid: string): Promise<{ message: string }> {
		return this.request("DELETE", `/databases/${dbUuid}/envs/${envUuid}`);
	}

	// Database Logs
	async getDatabaseLogs(uuid: string, lines = 100): Promise<string> {
		return this.request<string>("GET", `/databases/${uuid}/logs?lines=${lines}`);
	}

	// Database Backups
	async createDatabaseBackup(uuid: string): Promise<{ message: string }> {
		return this.request("POST", `/databases/${uuid}/backups`);
	}

	async deleteDatabaseBackup(
		uuid: string,
		backupUuid: string,
		opts?: { delete_s3?: boolean },
	): Promise<{ message: string }> {
		const qs = opts?.delete_s3 ? "?delete_s3=true" : "";
		return this.request("DELETE", `/databases/${uuid}/backups/${backupUuid}${qs}`);
	}

	// Services
	async listServices(): Promise<Service[]> {
		return this.request<Service[]>("GET", "/services");
	}

	async getService(uuid: string): Promise<Service> {
		return this.request<Service>("GET", `/services/${uuid}`);
	}

	async deleteService(
		uuid: string,
		opts?: { delete_volumes?: boolean; docker_cleanup?: boolean },
	): Promise<{ message: string }> {
		const params = new URLSearchParams();
		if (opts?.delete_volumes !== undefined)
			params.set("delete_volumes", String(opts.delete_volumes));
		if (opts?.docker_cleanup !== undefined)
			params.set("docker_cleanup", String(opts.docker_cleanup));
		const qs = params.toString();
		return this.request("DELETE", `/services/${uuid}${qs ? `?${qs}` : ""}`);
	}

	async startService(uuid: string): Promise<{ message: string }> {
		return this.request("POST", `/services/${uuid}/start`);
	}

	async stopService(
		uuid: string,
		opts?: { docker_cleanup?: boolean },
	): Promise<{ message: string }> {
		const params = new URLSearchParams();
		if (opts?.docker_cleanup !== undefined)
			params.set("docker_cleanup", String(opts.docker_cleanup));
		const qs = params.toString();
		return this.request("POST", `/services/${uuid}/stop${qs ? `?${qs}` : ""}`);
	}

	async restartService(uuid: string): Promise<{ message: string }> {
		return this.request("POST", `/services/${uuid}/restart`);
	}

	// Environment Variables
	async listEnvs(appUuid: string): Promise<EnvironmentVariable[]> {
		return this.request<EnvironmentVariable[]>("GET", `/applications/${appUuid}/envs`);
	}

	async createEnv(
		appUuid: string,
		data: {
			key: string;
			value: string;
			is_preview?: boolean;
			is_literal?: boolean;
			is_multiline?: boolean;
			is_shown_once?: boolean;
			comment?: string;
		},
	): Promise<{ uuid: string }> {
		return this.request("POST", `/applications/${appUuid}/envs`, data);
	}

	async updateEnvsBulk(
		appUuid: string,
		envs: Array<{
			key: string;
			value: string;
			is_preview?: boolean;
			is_literal?: boolean;
			is_multiline?: boolean;
			is_shown_once?: boolean;
			comment?: string;
		}>,
	): Promise<EnvironmentVariable[]> {
		return this.request("PATCH", `/applications/${appUuid}/envs/bulk`, { data: envs });
	}

	async deleteEnv(appUuid: string, envUuid: string): Promise<{ message: string }> {
		return this.request("DELETE", `/applications/${appUuid}/envs/${envUuid}`);
	}

	// Projects & Environments
	async listProjects(): Promise<Project[]> {
		return this.request<Project[]>("GET", "/projects");
	}

	async getProject(uuid: string): Promise<Project> {
		return this.request<Project>("GET", `/projects/${uuid}`);
	}

	async listEnvironments(projectUuid: string): Promise<Environment[]> {
		return this.request<Environment[]>("GET", `/projects/${projectUuid}/environments`);
	}

	async getEnvironment(projectUuid: string, envName: string): Promise<Environment> {
		return this.request<Environment>("GET", `/projects/${projectUuid}/${envName}`);
	}

	async createProject(data: { name: string; description?: string }): Promise<{ uuid: string }> {
		return this.request<{ uuid: string }>("POST", "/projects", data);
	}

	async updateProject(uuid: string, data: Record<string, unknown>): Promise<{ uuid: string }> {
		return this.request<{ uuid: string }>("PATCH", `/projects/${uuid}`, data);
	}

	async deleteProject(uuid: string): Promise<{ message: string }> {
		return this.request("DELETE", `/projects/${uuid}`);
	}

	async createEnvironment(projectUuid: string, data: { name: string }): Promise<{ uuid: string }> {
		return this.request<{ uuid: string }>("POST", `/projects/${projectUuid}/environments`, data);
	}

	async deleteEnvironment(
		projectUuid: string,
		envNameOrUuid: string,
	): Promise<{ message: string }> {
		return this.request("DELETE", `/projects/${projectUuid}/environments/${envNameOrUuid}`);
	}

	// Applications - create
	async createApplication(
		sourceType: string,
		data: Record<string, unknown>,
	): Promise<{ uuid: string }> {
		return this.request<{ uuid: string }>("POST", `/applications/${sourceType}`, data);
	}

	// Databases - create
	async createDatabase(type: string, data: Record<string, unknown>): Promise<{ uuid: string }> {
		return this.request<{ uuid: string }>("POST", `/databases/${type}`, data);
	}

	// Service Logs
	async getServiceLogs(uuid: string, lines = 100): Promise<string> {
		return this.request<string>("GET", `/services/${uuid}/logs?lines=${lines}`);
	}

	// Service Environment Variables
	async listServiceEnvs(serviceUuid: string): Promise<EnvironmentVariable[]> {
		return this.request<EnvironmentVariable[]>("GET", `/services/${serviceUuid}/envs`);
	}

	async createServiceEnv(
		serviceUuid: string,
		data: {
			key: string;
			value: string;
			is_preview?: boolean;
			is_literal?: boolean;
			is_multiline?: boolean;
			is_shown_once?: boolean;
			comment?: string;
		},
	): Promise<{ uuid: string }> {
		return this.request("POST", `/services/${serviceUuid}/envs`, data);
	}

	async updateServiceEnvsBulk(
		serviceUuid: string,
		envs: Array<{
			key: string;
			value: string;
			is_preview?: boolean;
			is_literal?: boolean;
			is_multiline?: boolean;
			is_shown_once?: boolean;
			comment?: string;
		}>,
	): Promise<EnvironmentVariable[]> {
		return this.request("PATCH", `/services/${serviceUuid}/envs/bulk`, { data: envs });
	}

	async deleteServiceEnv(serviceUuid: string, envUuid: string): Promise<{ message: string }> {
		return this.request("DELETE", `/services/${serviceUuid}/envs/${envUuid}`);
	}

	// Services - create + update
	async createService(data: Record<string, unknown>): Promise<{ uuid: string }> {
		return this.request<{ uuid: string }>("POST", "/services", data);
	}

	async updateService(uuid: string, data: Record<string, unknown>): Promise<{ uuid: string }> {
		return this.request<{ uuid: string }>("PATCH", `/services/${uuid}`, data);
	}

	// Private Keys
	async listPrivateKeys(): Promise<PrivateKey[]> {
		return this.request<PrivateKey[]>("GET", "/security/keys");
	}

	async getPrivateKey(uuid: string): Promise<PrivateKey> {
		return this.request<PrivateKey>("GET", `/security/keys/${uuid}`);
	}

	async createPrivateKey(data: {
		name: string;
		description?: string;
		private_key: string;
	}): Promise<{ uuid: string }> {
		return this.request<{ uuid: string }>("POST", "/security/keys", data);
	}

	async updatePrivateKey(uuid: string, data: Record<string, unknown>): Promise<{ uuid: string }> {
		return this.request<{ uuid: string }>("PATCH", `/security/keys/${uuid}`, data);
	}

	async deletePrivateKey(uuid: string): Promise<{ message: string }> {
		return this.request("DELETE", `/security/keys/${uuid}`);
	}

	// System
	async getVersion(): Promise<string> {
		return this.request<string>("GET", "/version");
	}

	async healthcheck(): Promise<string> {
		return this.request<string>("GET", "/health");
	}

	// Teams
	async listTeams(): Promise<Team[]> {
		return this.request<Team[]>("GET", "/teams");
	}

	async getCurrentTeam(): Promise<Team> {
		return this.request<Team>("GET", "/teams/current");
	}

	async getTeamMembers(teamId: number): Promise<TeamMember[]> {
		return this.request<TeamMember[]>("GET", `/teams/${teamId}/members`);
	}

	// Application Scheduled Tasks
	async listApplicationScheduledTasks(uuid: string): Promise<ScheduledTask[]> {
		return this.request<ScheduledTask[]>("GET", `/applications/${uuid}/scheduled-tasks`);
	}

	async createApplicationScheduledTask(
		uuid: string,
		data: {
			name: string;
			command: string;
			frequency: string;
			container?: string;
			timeout?: number;
			enabled?: boolean;
		},
	): Promise<{ uuid: string }> {
		return this.request<{ uuid: string }>("POST", `/applications/${uuid}/scheduled-tasks`, data);
	}

	async updateApplicationScheduledTask(
		uuid: string,
		taskUuid: string,
		data: Record<string, unknown>,
	): Promise<{ uuid: string }> {
		return this.request<{ uuid: string }>(
			"PATCH",
			`/applications/${uuid}/scheduled-tasks/${taskUuid}`,
			data,
		);
	}

	async deleteApplicationScheduledTask(
		uuid: string,
		taskUuid: string,
	): Promise<{ message: string }> {
		return this.request("DELETE", `/applications/${uuid}/scheduled-tasks/${taskUuid}`);
	}

	async listApplicationScheduledTaskExecutions(
		uuid: string,
		taskUuid: string,
	): Promise<ScheduledTaskExecution[]> {
		return this.request<ScheduledTaskExecution[]>(
			"GET",
			`/applications/${uuid}/scheduled-tasks/${taskUuid}/executions`,
		);
	}

	// Service Scheduled Tasks
	async listServiceScheduledTasks(uuid: string): Promise<ScheduledTask[]> {
		return this.request<ScheduledTask[]>("GET", `/services/${uuid}/scheduled-tasks`);
	}

	async createServiceScheduledTask(
		uuid: string,
		data: {
			name: string;
			command: string;
			frequency: string;
			container?: string;
			timeout?: number;
			enabled?: boolean;
		},
	): Promise<{ uuid: string }> {
		return this.request<{ uuid: string }>("POST", `/services/${uuid}/scheduled-tasks`, data);
	}

	async updateServiceScheduledTask(
		uuid: string,
		taskUuid: string,
		data: Record<string, unknown>,
	): Promise<{ uuid: string }> {
		return this.request<{ uuid: string }>(
			"PATCH",
			`/services/${uuid}/scheduled-tasks/${taskUuid}`,
			data,
		);
	}

	async deleteServiceScheduledTask(uuid: string, taskUuid: string): Promise<{ message: string }> {
		return this.request("DELETE", `/services/${uuid}/scheduled-tasks/${taskUuid}`);
	}

	async listServiceScheduledTaskExecutions(
		uuid: string,
		taskUuid: string,
	): Promise<ScheduledTaskExecution[]> {
		return this.request<ScheduledTaskExecution[]>(
			"GET",
			`/services/${uuid}/scheduled-tasks/${taskUuid}/executions`,
		);
	}

	// Application Storages
	async listApplicationStorages(uuid: string): Promise<Storage[]> {
		return this.request<Storage[]>("GET", `/applications/${uuid}/storages`);
	}

	async createApplicationStorage(
		uuid: string,
		data: { name: string; mount_path: string; host_path?: string; content?: string },
	): Promise<{ uuid: string }> {
		return this.request<{ uuid: string }>("POST", `/applications/${uuid}/storages`, data);
	}

	async updateApplicationStorage(
		uuid: string,
		data: Record<string, unknown>,
	): Promise<{ uuid: string }> {
		return this.request<{ uuid: string }>("PATCH", `/applications/${uuid}/storages`, data);
	}

	async deleteApplicationStorage(uuid: string, storageUuid: string): Promise<{ message: string }> {
		return this.request("DELETE", `/applications/${uuid}/storages/${storageUuid}`);
	}

	// Database Storages
	async listDatabaseStorages(uuid: string): Promise<Storage[]> {
		return this.request<Storage[]>("GET", `/databases/${uuid}/storages`);
	}

	async createDatabaseStorage(
		uuid: string,
		data: { name: string; mount_path: string; host_path?: string; content?: string },
	): Promise<{ uuid: string }> {
		return this.request<{ uuid: string }>("POST", `/databases/${uuid}/storages`, data);
	}

	async updateDatabaseStorage(
		uuid: string,
		data: Record<string, unknown>,
	): Promise<{ uuid: string }> {
		return this.request<{ uuid: string }>("PATCH", `/databases/${uuid}/storages`, data);
	}

	async deleteDatabaseStorage(uuid: string, storageUuid: string): Promise<{ message: string }> {
		return this.request("DELETE", `/databases/${uuid}/storages/${storageUuid}`);
	}

	// Service Storages
	async listServiceStorages(uuid: string): Promise<Storage[]> {
		return this.request<Storage[]>("GET", `/services/${uuid}/storages`);
	}

	async createServiceStorage(
		uuid: string,
		data: { name: string; mount_path: string; host_path?: string; content?: string },
	): Promise<{ uuid: string }> {
		return this.request<{ uuid: string }>("POST", `/services/${uuid}/storages`, data);
	}

	async updateServiceStorage(
		uuid: string,
		data: Record<string, unknown>,
	): Promise<{ uuid: string }> {
		return this.request<{ uuid: string }>("PATCH", `/services/${uuid}/storages`, data);
	}

	async deleteServiceStorage(uuid: string, storageUuid: string): Promise<{ message: string }> {
		return this.request("DELETE", `/services/${uuid}/storages/${storageUuid}`);
	}

	// GitHub Apps
	async listGitHubApps(): Promise<GitHubApp[]> {
		return this.request<GitHubApp[]>("GET", "/github-apps");
	}

	async createGitHubApp(data: Record<string, unknown>): Promise<{ id: number }> {
		return this.request<{ id: number }>("POST", "/github-apps", data);
	}

	async updateGitHubApp(id: number, data: Record<string, unknown>): Promise<{ id: number }> {
		return this.request<{ id: number }>("PATCH", `/github-apps/${id}`, data);
	}

	async deleteGitHubApp(id: number): Promise<{ message: string }> {
		return this.request("DELETE", `/github-apps/${id}`);
	}

	async listGitHubAppRepositories(id: number): Promise<GitHubRepository[]> {
		return this.request<GitHubRepository[]>("GET", `/github-apps/${id}/repositories`);
	}

	async listGitHubAppBranches(id: number, owner: string, repo: string): Promise<GitHubBranch[]> {
		return this.request<GitHubBranch[]>(
			"GET",
			`/github-apps/${id}/repositories/${owner}/${repo}/branches`,
		);
	}

	// Backup Executions
	async listBackupExecutions(dbUuid: string, backupUuid: string): Promise<BackupExecution[]> {
		return this.request<BackupExecution[]>(
			"GET",
			`/databases/${dbUuid}/backups/${backupUuid}/executions`,
		);
	}

	async deleteBackupExecution(
		dbUuid: string,
		backupUuid: string,
		executionUuid: string,
	): Promise<{ message: string }> {
		return this.request(
			"DELETE",
			`/databases/${dbUuid}/backups/${backupUuid}/executions/${executionUuid}`,
		);
	}

	// Backup Schedule Update
	async updateDatabaseBackup(
		dbUuid: string,
		backupUuid: string,
		data: Record<string, unknown>,
	): Promise<{ uuid: string }> {
		return this.request<{ uuid: string }>(
			"PATCH",
			`/databases/${dbUuid}/backups/${backupUuid}`,
			data,
		);
	}

	// Resources (aggregate)
	async listResources(): Promise<unknown[]> {
		return this.request<unknown[]>("GET", "/resources");
	}
}
