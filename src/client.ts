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
	StorageListResponse,
	StorageType,
	Team,
	TeamMember,
	VolumeBackupSchedule,
	VolumeBackupScheduleInput,
} from "./types/api";
import { normalizeStorageList } from "./types/api";

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

	private seg(value: string): string {
		return encodeURIComponent(value);
	}

	private withQuery(
		path: string,
		params: Record<string, string | number | boolean | undefined>,
	): string {
		const search = new URLSearchParams();
		for (const [key, value] of Object.entries(params)) {
			if (value !== undefined) search.set(key, String(value));
		}
		const qs = search.toString();
		return qs ? `${path}?${qs}` : path;
	}

	private defined(data: Record<string, unknown>): Record<string, unknown> | undefined {
		const entries = Object.entries(data).filter(([, value]) => value !== undefined);
		return entries.length > 0 ? Object.fromEntries(entries) : undefined;
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
		// Coolify v4.2+: state-changing endpoints require POST (GET returns 405).
		const body: Record<string, unknown> = { uuid };
		if (force) body.force = true;
		return this.request("POST", "/deploy", body);
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

	async validateServer(uuid: string, opts?: { install?: boolean }): Promise<{ message: string }> {
		// Coolify v4.2+: POST only (GET returns 405 via post_required).
		const body = opts?.install !== undefined ? { install: opts.install } : undefined;
		return this.request("POST", `/servers/${uuid}/validate`, body);
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
		return this.request("POST", `/databases/${uuid}/start`);
	}

	async stopDatabase(
		uuid: string,
		opts?: { docker_cleanup?: boolean },
	): Promise<{ message: string }> {
		const params = new URLSearchParams();
		if (opts?.docker_cleanup !== undefined)
			params.set("docker_cleanup", String(opts.docker_cleanup));
		const qs = params.toString();
		return this.request("POST", `/databases/${uuid}/stop${qs ? `?${qs}` : ""}`);
	}

	async restartDatabase(uuid: string): Promise<{ message: string }> {
		return this.request("POST", `/databases/${uuid}/restart`);
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

	// Teams (current token team uses /team; /teams/current is deprecated)
	async listTeams(): Promise<Team[]> {
		return this.request<Team[]>("GET", "/teams");
	}

	async getCurrentTeam(): Promise<Team> {
		return this.request<Team>("GET", "/team");
	}

	async getCurrentTeamMembers(): Promise<TeamMember[]> {
		return this.request<TeamMember[]>("GET", "/team/members");
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

	// Application Storages (Coolify v4.3: list returns {persistent_storages,file_storages};
	// create requires type; update is PATCH /storages with uuid+type in body)
	async listApplicationStorages(uuid: string): Promise<Storage[]> {
		const response = await this.request<StorageListResponse | Storage[]>(
			"GET",
			`/applications/${uuid}/storages`,
		);
		return normalizeStorageList(response);
	}

	async createApplicationStorage(
		uuid: string,
		data: {
			type: StorageType;
			name?: string;
			mount_path: string;
			host_path?: string;
			content?: string;
			is_directory?: boolean;
			fs_path?: string;
		},
	): Promise<{ uuid?: string } & Record<string, unknown>> {
		return this.request("POST", `/applications/${uuid}/storages`, data);
	}

	async updateApplicationStorage(
		uuid: string,
		data: {
			uuid: string;
			type: StorageType;
			name?: string;
			mount_path?: string;
			host_path?: string | null;
			content?: string | null;
			is_preview_suffix_enabled?: boolean;
		},
	): Promise<Record<string, unknown>> {
		return this.request("PATCH", `/applications/${uuid}/storages`, data);
	}

	async deleteApplicationStorage(uuid: string, storageUuid: string): Promise<{ message: string }> {
		return this.request("DELETE", `/applications/${uuid}/storages/${storageUuid}`);
	}

	// Database Storages
	async listDatabaseStorages(uuid: string): Promise<Storage[]> {
		const response = await this.request<StorageListResponse | Storage[]>(
			"GET",
			`/databases/${uuid}/storages`,
		);
		return normalizeStorageList(response);
	}

	async createDatabaseStorage(
		uuid: string,
		data: {
			type: StorageType;
			name?: string;
			mount_path: string;
			host_path?: string;
			content?: string;
			is_directory?: boolean;
			fs_path?: string;
		},
	): Promise<{ uuid?: string } & Record<string, unknown>> {
		return this.request("POST", `/databases/${uuid}/storages`, data);
	}

	async updateDatabaseStorage(
		uuid: string,
		data: {
			uuid: string;
			type: StorageType;
			name?: string;
			mount_path?: string;
			host_path?: string | null;
			content?: string | null;
			is_preview_suffix_enabled?: boolean;
		},
	): Promise<Record<string, unknown>> {
		return this.request("PATCH", `/databases/${uuid}/storages`, data);
	}

	async deleteDatabaseStorage(uuid: string, storageUuid: string): Promise<{ message: string }> {
		return this.request("DELETE", `/databases/${uuid}/storages/${storageUuid}`);
	}

	// Service Storages
	async listServiceStorages(uuid: string): Promise<Storage[]> {
		const response = await this.request<StorageListResponse | Storage[]>(
			"GET",
			`/services/${uuid}/storages`,
		);
		return normalizeStorageList(response);
	}

	async createServiceStorage(
		uuid: string,
		data: {
			type: StorageType;
			resource_uuid: string;
			name?: string;
			mount_path: string;
			host_path?: string;
			content?: string;
			is_directory?: boolean;
			fs_path?: string;
		},
	): Promise<{ uuid?: string } & Record<string, unknown>> {
		return this.request("POST", `/services/${uuid}/storages`, data);
	}

	async updateServiceStorage(
		uuid: string,
		data: {
			uuid: string;
			type: StorageType;
			name?: string;
			mount_path?: string;
			host_path?: string | null;
			content?: string | null;
			is_preview_suffix_enabled?: boolean;
		},
	): Promise<Record<string, unknown>> {
		return this.request("PATCH", `/services/${uuid}/storages`, data);
	}

	async deleteServiceStorage(uuid: string, storageUuid: string): Promise<{ message: string }> {
		return this.request("DELETE", `/services/${uuid}/storages/${storageUuid}`);
	}

	// Volume / storage backups (Coolify v4.3+)
	async upsertApplicationStorageBackup(
		uuid: string,
		storageUuid: string,
		data: VolumeBackupScheduleInput,
	): Promise<VolumeBackupSchedule> {
		return this.request("PUT", `/applications/${uuid}/storages/${storageUuid}/backups`, data);
	}

	async runApplicationStorageBackup(
		uuid: string,
		storageUuid: string,
	): Promise<{ message: string }> {
		return this.request("POST", `/applications/${uuid}/storages/${storageUuid}/backups/run`);
	}

	async deleteApplicationStorageBackup(
		uuid: string,
		storageUuid: string,
	): Promise<{ message: string }> {
		return this.request("DELETE", `/applications/${uuid}/storages/${storageUuid}/backups`);
	}

	async upsertDatabaseStorageBackup(
		uuid: string,
		storageUuid: string,
		data: VolumeBackupScheduleInput,
	): Promise<VolumeBackupSchedule> {
		return this.request("PUT", `/databases/${uuid}/storages/${storageUuid}/backups`, data);
	}

	async runDatabaseStorageBackup(uuid: string, storageUuid: string): Promise<{ message: string }> {
		return this.request("POST", `/databases/${uuid}/storages/${storageUuid}/backups/run`);
	}

	async deleteDatabaseStorageBackup(
		uuid: string,
		storageUuid: string,
	): Promise<{ message: string }> {
		return this.request("DELETE", `/databases/${uuid}/storages/${storageUuid}/backups`);
	}

	async upsertServiceStorageBackup(
		uuid: string,
		storageUuid: string,
		data: VolumeBackupScheduleInput,
	): Promise<VolumeBackupSchedule> {
		return this.request("PUT", `/services/${uuid}/storages/${storageUuid}/backups`, data);
	}

	async runServiceStorageBackup(uuid: string, storageUuid: string): Promise<{ message: string }> {
		return this.request("POST", `/services/${uuid}/storages/${storageUuid}/backups/run`);
	}

	async deleteServiceStorageBackup(
		uuid: string,
		storageUuid: string,
	): Promise<{ message: string }> {
		return this.request("DELETE", `/services/${uuid}/storages/${storageUuid}/backups`);
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

	async getTeam(id: number): Promise<Team> {
		return this.request<Team>("GET", `/teams/${id}`);
	}

	// Instance email settings (Coolify v4.3.23)
	async getInstanceEmailSettings(): Promise<Record<string, unknown>> {
		return this.request("GET", "/settings/email");
	}

	async updateInstanceEmailSettings(
		data: Record<string, unknown>,
	): Promise<Record<string, unknown>> {
		return this.request("PATCH", "/settings/email", data);
	}

	// Preview deployments
	async getPreviewLogs(
		uuid: string,
		pullRequestId: number,
		lines = 100,
		showTimestamps?: boolean,
	): Promise<unknown> {
		return this.request(
			"GET",
			this.withQuery(`/applications/${this.seg(uuid)}/previews/${pullRequestId}/logs`, {
				lines,
				show_timestamps: showTimestamps,
			}),
		);
	}

	async updatePreview(
		uuid: string,
		pullRequestId: number,
		data: Record<string, unknown>,
	): Promise<Record<string, unknown>> {
		return this.request("PATCH", `/applications/${this.seg(uuid)}/previews/${pullRequestId}`, data);
	}

	async deletePreview(uuid: string, pullRequestId: number): Promise<{ message: string }> {
		return this.request("DELETE", `/applications/${this.seg(uuid)}/previews/${pullRequestId}`);
	}

	// Tags
	async listTags(): Promise<unknown[]> {
		return this.request("GET", "/tags");
	}

	async createTag(name: string): Promise<unknown> {
		return this.request("POST", "/tags", { name });
	}

	async updateTag(uuid: string, name: string): Promise<unknown> {
		return this.request("PATCH", `/tags/${this.seg(uuid)}`, { name });
	}

	async deleteTag(uuid: string): Promise<{ message: string }> {
		return this.request("DELETE", `/tags/${this.seg(uuid)}`);
	}

	async listResourceTags(kind: CoolifyResourceKind, uuid: string): Promise<unknown[]> {
		return this.request("GET", `/${kind}/${this.seg(uuid)}/tags`);
	}

	async addResourceTags(
		kind: CoolifyResourceKind,
		uuid: string,
		data: { tag_name?: string; tag_names?: string[] },
	): Promise<unknown> {
		return this.request("POST", `/${kind}/${this.seg(uuid)}/tags`, this.defined(data));
	}

	async removeResourceTag(
		kind: CoolifyResourceKind,
		uuid: string,
		tagUuid: string,
	): Promise<{ message: string }> {
		return this.request("DELETE", `/${kind}/${this.seg(uuid)}/tags/${this.seg(tagUuid)}`);
	}

	// Destinations
	async listDestinations(): Promise<unknown[]> {
		return this.request("GET", "/destinations");
	}

	async getDestination(uuid: string): Promise<Record<string, unknown>> {
		return this.request("GET", `/destinations/${this.seg(uuid)}`);
	}

	async updateDestination(uuid: string, name: string): Promise<Record<string, unknown>> {
		return this.request("PATCH", `/destinations/${this.seg(uuid)}`, { name });
	}

	async deleteDestination(uuid: string): Promise<{ message: string }> {
		return this.request("DELETE", `/destinations/${this.seg(uuid)}`);
	}

	async listServerDestinations(serverUuid: string): Promise<unknown[]> {
		return this.request("GET", `/servers/${this.seg(serverUuid)}/destinations`);
	}

	async createDestination(
		serverUuid: string,
		data: { network: string; name?: string; type?: "standalone" | "swarm" },
	): Promise<Record<string, unknown>> {
		return this.request(
			"POST",
			`/servers/${this.seg(serverUuid)}/destinations`,
			this.defined(data),
		);
	}

	async listApplicationDestinations(uuid: string): Promise<unknown[]> {
		return this.request("GET", `/applications/${this.seg(uuid)}/destinations`);
	}

	async addApplicationDestination(
		uuid: string,
		destinationUuid: string,
	): Promise<{ message: string }> {
		return this.request("POST", `/applications/${this.seg(uuid)}/destinations`, {
			destination_uuid: destinationUuid,
		});
	}

	async removeApplicationDestination(
		uuid: string,
		destinationUuid: string,
	): Promise<{ message: string }> {
		return this.request(
			"DELETE",
			`/applications/${this.seg(uuid)}/destinations/${this.seg(destinationUuid)}`,
		);
	}

	// Move between environments, clone, and dev-only server migration
	async moveResource(
		kind: CoolifyResourceKind,
		uuid: string,
		environmentUuid: string,
	): Promise<Record<string, unknown>> {
		return this.request("POST", `/${kind}/${this.seg(uuid)}/move`, {
			environment_uuid: environmentUuid,
		});
	}

	async cloneResource(
		kind: CoolifyResourceKind,
		uuid: string,
		data: { destination_uuid: string; name?: string; clone_volumes?: boolean },
	): Promise<Record<string, unknown>> {
		return this.request("POST", `/${kind}/${this.seg(uuid)}/clone`, this.defined(data));
	}

	async migrateResource(
		kind: CoolifyResourceKind,
		uuid: string,
		data: { destination_uuid: string; migrate_volumes?: boolean },
	): Promise<Record<string, unknown>> {
		return this.request("POST", `/${kind}/${this.seg(uuid)}/migrate`, this.defined(data));
	}

	async listRollbackImages(uuid: string): Promise<Record<string, unknown>> {
		return this.request("GET", `/applications/${this.seg(uuid)}/rollback-images`);
	}

	async rollbackApplication(uuid: string, commit: string): Promise<Record<string, unknown>> {
		return this.request("POST", `/applications/${this.seg(uuid)}/rollback`, { commit });
	}

	async updateEnvironment(
		projectUuid: string,
		environmentNameOrUuid: string,
		data: { name?: string; description?: string },
	): Promise<Record<string, unknown>> {
		return this.request(
			"PATCH",
			`/projects/${this.seg(projectUuid)}/environments/${this.seg(environmentNameOrUuid)}`,
			this.defined(data),
		);
	}

	// Shared environment variables
	async listSharedEnvs(scope: SharedEnvScope): Promise<unknown[]> {
		return this.request("GET", this.sharedEnvBase(scope));
	}

	async createSharedEnv(
		scope: SharedEnvScope,
		data: Record<string, unknown>,
	): Promise<Record<string, unknown>> {
		return this.request("POST", this.sharedEnvBase(scope), data);
	}

	async updateSharedEnv(
		scope: SharedEnvScope,
		envId: number,
		data: Record<string, unknown>,
	): Promise<Record<string, unknown>> {
		return this.request("PATCH", `${this.sharedEnvBase(scope)}/${envId}`, data);
	}

	async deleteSharedEnv(scope: SharedEnvScope, envId: number): Promise<{ message: string }> {
		return this.request("DELETE", `${this.sharedEnvBase(scope)}/${envId}`);
	}

	private sharedEnvBase(scope: SharedEnvScope): string {
		switch (scope.scope) {
			case "team":
				return "/team/envs";
			case "project":
				return `/projects/${this.seg(scope.projectUuid)}/envs`;
			case "environment":
				return `/projects/${this.seg(scope.projectUuid)}/environments/${this.seg(scope.environmentNameOrUuid)}/envs`;
			case "server":
				return `/servers/${this.seg(scope.serverUuid)}/envs`;
		}
	}

	// Team notification channels
	async getNotificationSettings(channel: NotificationChannel): Promise<Record<string, unknown>> {
		return this.request("GET", `/notifications/${channel}`);
	}

	async updateNotificationSettings(
		channel: NotificationChannel,
		data: Record<string, unknown>,
	): Promise<Record<string, unknown>> {
		return this.request("PATCH", `/notifications/${channel}`, data);
	}

	// S3 storages
	async listS3Storages(): Promise<unknown[]> {
		return this.request("GET", "/s3-storages");
	}

	async getS3Storage(uuid: string): Promise<Record<string, unknown>> {
		return this.request("GET", `/s3-storages/${this.seg(uuid)}`);
	}

	async createS3Storage(data: Record<string, unknown>): Promise<Record<string, unknown>> {
		return this.request("POST", "/s3-storages", data);
	}

	async updateS3Storage(
		uuid: string,
		data: Record<string, unknown>,
	): Promise<Record<string, unknown>> {
		return this.request("PATCH", `/s3-storages/${this.seg(uuid)}`, data);
	}

	async deleteS3Storage(uuid: string): Promise<{ message: string }> {
		return this.request("DELETE", `/s3-storages/${this.seg(uuid)}`);
	}

	async validateS3Storage(uuid: string): Promise<Record<string, unknown>> {
		return this.request("POST", `/s3-storages/${this.seg(uuid)}/validate`);
	}

	// Cloud provider tokens
	async listCloudTokens(): Promise<unknown[]> {
		return this.request("GET", "/cloud-tokens");
	}

	async getCloudToken(uuid: string): Promise<Record<string, unknown>> {
		return this.request("GET", `/cloud-tokens/${this.seg(uuid)}`);
	}

	async createCloudToken(data: {
		provider: "hetzner" | "digitalocean" | "vultr";
		token: string;
		name: string;
	}): Promise<Record<string, unknown>> {
		return this.request("POST", "/cloud-tokens", data);
	}

	async updateCloudToken(uuid: string, name: string): Promise<Record<string, unknown>> {
		return this.request("PATCH", `/cloud-tokens/${this.seg(uuid)}`, { name });
	}

	async deleteCloudToken(uuid: string): Promise<{ message: string }> {
		return this.request("DELETE", `/cloud-tokens/${this.seg(uuid)}`);
	}

	async validateCloudToken(uuid: string): Promise<Record<string, unknown>> {
		return this.request("POST", `/cloud-tokens/${this.seg(uuid)}/validate`);
	}

	// Cloud-init scripts
	async listCloudInitScripts(): Promise<unknown[]> {
		return this.request("GET", "/cloud-init-scripts");
	}

	async getCloudInitScript(uuid: string): Promise<Record<string, unknown>> {
		return this.request("GET", `/cloud-init-scripts/${this.seg(uuid)}`);
	}

	async createCloudInitScript(data: {
		name: string;
		script: string;
	}): Promise<Record<string, unknown>> {
		return this.request("POST", "/cloud-init-scripts", data);
	}

	async updateCloudInitScript(
		uuid: string,
		data: { name?: string; script?: string },
	): Promise<Record<string, unknown>> {
		return this.request("PATCH", `/cloud-init-scripts/${this.seg(uuid)}`, this.defined(data));
	}

	async deleteCloudInitScript(uuid: string): Promise<{ message: string }> {
		return this.request("DELETE", `/cloud-init-scripts/${this.seg(uuid)}`);
	}

	// Server subsystems
	async getDockerCleanup(uuid: string): Promise<Record<string, unknown>> {
		return this.request("GET", `/servers/${this.seg(uuid)}/docker-cleanup`);
	}

	async updateDockerCleanup(
		uuid: string,
		data: Record<string, unknown>,
	): Promise<Record<string, unknown>> {
		return this.request("PATCH", `/servers/${this.seg(uuid)}/docker-cleanup`, data);
	}

	async runDockerCleanup(
		uuid: string,
		data?: { delete_unused_volumes?: boolean; delete_unused_networks?: boolean },
	): Promise<{ message: string }> {
		return this.request(
			"POST",
			`/servers/${this.seg(uuid)}/docker-cleanup/run`,
			data ? this.defined(data) : undefined,
		);
	}

	async listDockerCleanupExecutions(uuid: string): Promise<unknown[]> {
		return this.request("GET", `/servers/${this.seg(uuid)}/docker-cleanup/executions`);
	}

	async getLogDrains(uuid: string): Promise<Record<string, unknown>> {
		return this.request("GET", `/servers/${this.seg(uuid)}/log-drains`);
	}

	async updateLogDrains(
		uuid: string,
		data: Record<string, unknown>,
	): Promise<Record<string, unknown>> {
		return this.request("PATCH", `/servers/${this.seg(uuid)}/log-drains`, data);
	}

	async getSentinel(uuid: string): Promise<Record<string, unknown>> {
		return this.request("GET", `/servers/${this.seg(uuid)}/sentinel`);
	}

	async updateSentinel(
		uuid: string,
		data: Record<string, unknown>,
	): Promise<Record<string, unknown>> {
		return this.request("PATCH", `/servers/${this.seg(uuid)}/sentinel`, data);
	}

	async getCloudflareTunnel(uuid: string): Promise<Record<string, unknown>> {
		return this.request("GET", `/servers/${this.seg(uuid)}/cloudflare-tunnel`);
	}

	async updateCloudflareTunnel(uuid: string, enabled: boolean): Promise<Record<string, unknown>> {
		return this.request("PATCH", `/servers/${this.seg(uuid)}/cloudflare-tunnel`, {
			is_cloudflare_tunnel: enabled,
		});
	}

	async enableCloudflareTunnel(uuid: string): Promise<Record<string, unknown>> {
		return this.request("POST", `/servers/${this.seg(uuid)}/cloudflare-tunnel/enable`);
	}

	async disableCloudflareTunnel(uuid: string): Promise<Record<string, unknown>> {
		return this.request("POST", `/servers/${this.seg(uuid)}/cloudflare-tunnel/disable`);
	}

	async getServerProxy(uuid: string): Promise<Record<string, unknown>> {
		return this.request("GET", `/servers/${this.seg(uuid)}/proxy`);
	}

	async updateServerProxy(
		uuid: string,
		data: Record<string, unknown>,
	): Promise<Record<string, unknown>> {
		return this.request("PATCH", `/servers/${this.seg(uuid)}/proxy`, data);
	}

	async saveServerProxyConfiguration(
		uuid: string,
		configuration: string,
	): Promise<Record<string, unknown>> {
		return this.request("PUT", `/servers/${this.seg(uuid)}/proxy/configuration`, { configuration });
	}

	async restartServerProxy(uuid: string): Promise<{ message: string }> {
		return this.request("POST", `/servers/${this.seg(uuid)}/proxy/restart`);
	}

	// GitLab Apps
	async listGitLabApps(): Promise<unknown[]> {
		return this.request("GET", "/gitlab-apps");
	}

	async createGitLabApp(data: Record<string, unknown>): Promise<Record<string, unknown>> {
		return this.request("POST", "/gitlab-apps", data);
	}

	async updateGitLabApp(
		id: number,
		data: Record<string, unknown>,
	): Promise<Record<string, unknown>> {
		return this.request("PATCH", `/gitlab-apps/${id}`, data);
	}

	async deleteGitLabApp(id: number): Promise<{ message: string }> {
		return this.request("DELETE", `/gitlab-apps/${id}`);
	}

	// Service compose applications and databases
	async listServiceApplications(uuid: string): Promise<unknown[]> {
		return this.request("GET", `/services/${this.seg(uuid)}/applications`);
	}

	async getServiceApplication(uuid: string, appUuid: string): Promise<Record<string, unknown>> {
		return this.request("GET", `/services/${this.seg(uuid)}/applications/${this.seg(appUuid)}`);
	}

	async updateServiceApplication(
		uuid: string,
		appUuid: string,
		data: Record<string, unknown>,
	): Promise<Record<string, unknown>> {
		return this.request(
			"PATCH",
			`/services/${this.seg(uuid)}/applications/${this.seg(appUuid)}`,
			data,
		);
	}

	async getServiceApplicationLogs(uuid: string, appUuid: string, lines = 100): Promise<unknown> {
		return this.request(
			"GET",
			this.withQuery(`/services/${this.seg(uuid)}/applications/${this.seg(appUuid)}/logs`, {
				lines,
			}),
		);
	}

	async startServiceApplication(
		uuid: string,
		appUuid: string,
		opts?: { force?: boolean; latest?: boolean },
	): Promise<{ message: string }> {
		return this.request(
			"POST",
			this.withQuery(`/services/${this.seg(uuid)}/applications/${this.seg(appUuid)}/start`, {
				force: opts?.force,
				latest: opts?.latest,
			}),
		);
	}

	async restartServiceApplication(uuid: string, appUuid: string): Promise<{ message: string }> {
		return this.request(
			"POST",
			`/services/${this.seg(uuid)}/applications/${this.seg(appUuid)}/restart`,
		);
	}

	async stopServiceApplication(uuid: string, appUuid: string): Promise<{ message: string }> {
		return this.request(
			"POST",
			`/services/${this.seg(uuid)}/applications/${this.seg(appUuid)}/stop`,
		);
	}

	async listServiceDatabases(uuid: string): Promise<unknown[]> {
		return this.request("GET", `/services/${this.seg(uuid)}/databases`);
	}

	async getServiceDatabase(uuid: string, databaseUuid: string): Promise<Record<string, unknown>> {
		return this.request("GET", `/services/${this.seg(uuid)}/databases/${this.seg(databaseUuid)}`);
	}

	async updateServiceDatabase(
		uuid: string,
		databaseUuid: string,
		data: Record<string, unknown>,
	): Promise<Record<string, unknown>> {
		return this.request(
			"PATCH",
			`/services/${this.seg(uuid)}/databases/${this.seg(databaseUuid)}`,
			data,
		);
	}

	async getServiceDatabaseLogs(uuid: string, databaseUuid: string, lines = 100): Promise<unknown> {
		return this.request(
			"GET",
			this.withQuery(`/services/${this.seg(uuid)}/databases/${this.seg(databaseUuid)}/logs`, {
				lines,
			}),
		);
	}

	async startServiceDatabase(
		uuid: string,
		databaseUuid: string,
		opts?: { force?: boolean; latest?: boolean },
	): Promise<{ message: string }> {
		return this.request(
			"POST",
			this.withQuery(`/services/${this.seg(uuid)}/databases/${this.seg(databaseUuid)}/start`, {
				force: opts?.force,
				latest: opts?.latest,
			}),
		);
	}

	async restartServiceDatabase(uuid: string, databaseUuid: string): Promise<{ message: string }> {
		return this.request(
			"POST",
			`/services/${this.seg(uuid)}/databases/${this.seg(databaseUuid)}/restart`,
		);
	}

	async stopServiceDatabase(uuid: string, databaseUuid: string): Promise<{ message: string }> {
		return this.request(
			"POST",
			`/services/${this.seg(uuid)}/databases/${this.seg(databaseUuid)}/stop`,
		);
	}

	async executeApplicationScheduledTask(
		uuid: string,
		taskUuid: string,
	): Promise<{ message: string }> {
		return this.request(
			"POST",
			`/applications/${this.seg(uuid)}/scheduled-tasks/${this.seg(taskUuid)}/execute`,
		);
	}

	async executeServiceScheduledTask(uuid: string, taskUuid: string): Promise<{ message: string }> {
		return this.request(
			"POST",
			`/services/${this.seg(uuid)}/scheduled-tasks/${this.seg(taskUuid)}/execute`,
		);
	}

	// Cloud provider catalogs and server creation
	async listCloudProviderOptions(
		provider: CloudProvider,
		kind: string,
		cloudProviderTokenUuid: string,
	): Promise<unknown> {
		const paths: Record<CloudProvider, Record<string, string>> = {
			hetzner: {
				locations: "/hetzner/locations",
				"server-types": "/hetzner/server-types",
				images: "/hetzner/images",
				"ssh-keys": "/hetzner/ssh-keys",
				firewalls: "/hetzner/firewalls",
				networks: "/hetzner/networks",
			},
			vultr: {
				regions: "/vultr/regions",
				plans: "/vultr/plans",
				os: "/vultr/os",
				"ssh-keys": "/vultr/ssh-keys",
			},
			digitalocean: {
				regions: "/digitalocean/regions",
				sizes: "/digitalocean/sizes",
				images: "/digitalocean/images",
				"ssh-keys": "/digitalocean/ssh-keys",
			},
		};
		const path = paths[provider][kind];
		if (!path) {
			throw new Error(
				`Unsupported ${provider} catalog '${kind}'. Valid kinds: ${Object.keys(paths[provider]).join(", ")}.`,
			);
		}
		return this.request(
			"GET",
			this.withQuery(path, { cloud_provider_token_uuid: cloudProviderTokenUuid }),
		);
	}

	async createHetznerServer(data: Record<string, unknown>): Promise<Record<string, unknown>> {
		return this.request("POST", "/servers/hetzner", data);
	}

	async createVultrServer(data: Record<string, unknown>): Promise<Record<string, unknown>> {
		return this.request("POST", "/servers/vultr", data);
	}

	async createDigitalOceanServer(data: Record<string, unknown>): Promise<Record<string, unknown>> {
		return this.request("POST", "/servers/digitalocean", data);
	}

	// Server transfer between Coolify instances
	async exportServer(
		uuid: string,
		opts?: { encrypt?: boolean; passphrase?: string },
	): Promise<Record<string, unknown>> {
		return this.request(
			"GET",
			this.withQuery(`/servers/${this.seg(uuid)}/export`, {
				encrypt: opts?.encrypt,
				passphrase: opts?.passphrase,
			}),
		);
	}

	async importServer(data: Record<string, unknown>): Promise<Record<string, unknown>> {
		return this.request("POST", "/servers/import", data);
	}

	async transferServer(
		uuid: string,
		data: Record<string, unknown>,
	): Promise<Record<string, unknown>> {
		return this.request("POST", `/servers/${this.seg(uuid)}/migrate`, data);
	}

	async claimServer(
		uuid: string,
		data?: Record<string, unknown>,
	): Promise<Record<string, unknown>> {
		return this.request("POST", `/servers/${this.seg(uuid)}/claim`, data);
	}

	async completeServerTransfer(
		uuid: string,
		data?: Record<string, unknown>,
	): Promise<Record<string, unknown>> {
		return this.request("POST", `/servers/${this.seg(uuid)}/transfer/complete`, data);
	}

	async writeServerTransferMailbox(
		uuid: string,
		data: Record<string, unknown>,
	): Promise<Record<string, unknown>> {
		return this.request("POST", `/servers/${this.seg(uuid)}/export/mailbox`, data);
	}
}

export type CoolifyResourceKind = "applications" | "databases" | "services";

export type NotificationChannel =
	| "email"
	| "discord"
	| "slack"
	| "telegram"
	| "pushover"
	| "webhook";

export type CloudProvider = "hetzner" | "digitalocean" | "vultr";

export type SharedEnvScope =
	| { scope: "team" }
	| { scope: "project"; projectUuid: string }
	| { scope: "environment"; projectUuid: string; environmentNameOrUuid: string }
	| { scope: "server"; serverUuid: string };
