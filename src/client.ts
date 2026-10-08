import type { Config } from "./config";
import type {
	AuditEventFilter,
	DatabaseBackupInput,
	DatabaseImportInput,
	InstanceEmailSettings,
	IntegrationTokenInput,
	PreviewDeployInput,
	PreviewDomainsInput,
	SecretManagerLinkInput,
} from "./lib/api-schemas";

import { CoolifyApiError, NetworkError } from "./lib/errors";
import type {
	Application,
	ApplicationPreview,
	AuditEventPage,
	BackupExecution,
	Database,
	DatabaseImport,
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
	ServerRegistries,
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

type LogLines = number | "all";
type LogResponse = string | { logs: string };

function logQuery(lines: LogLines, showTimestamps?: boolean, serviceName?: string): string {
	const params = new URLSearchParams({ lines: String(lines) });
	if (showTimestamps !== undefined) params.set("show_timestamps", String(showTimestamps));
	if (serviceName) params.set("service_name", serviceName);
	return params.toString();
}

function validateStorageInput(data: { host_path?: string | null }): void {
	if (data.host_path !== undefined) {
		throw new Error(
			'Coolify no longer accepts host_path. Create a type="file" storage with fs_path and is_directory=true (directory) or is_host_file=true (existing host file). Existing mount sources cannot be changed by PATCH.',
		);
	}
}

// Mirrors the required_if / prohibited_unless rules of Coolify's import endpoint.
function validateImportInput(data: DatabaseImportInput): void {
	const allowed = {
		upload: { upload_id: true, s3_storage_uuid: false, path: false },
		s3: { upload_id: false, s3_storage_uuid: true, path: true },
		server: { upload_id: false, s3_storage_uuid: false, path: true },
	}[data.source];
	for (const [field, required] of Object.entries(allowed)) {
		const present = data[field as keyof typeof allowed] !== undefined;
		if (required && !present) throw new Error(`${field} is required when source=${data.source}.`);
		if (!required && present)
			throw new Error(`${field} is not allowed when source=${data.source}.`);
	}
}

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
		// Coolify v4.2+: state-changing endpoints require POST (GET returns 405).
		const body: Record<string, unknown> = { uuid };
		if (force) body.force = true;
		return this.request("POST", "/deploy", body);
	}

	async cancelDeployment(uuid: string): Promise<{ message: string }> {
		return this.request("POST", `/deployments/${uuid}/cancel`);
	}

	// Logs
	async getApplicationLogs(
		uuid: string,
		lines: LogLines = 100,
		showTimestamps?: boolean,
		serviceName?: string,
	): Promise<LogResponse> {
		return this.request(
			"GET",
			`/applications/${uuid}/logs?${logQuery(lines, showTimestamps, serviceName)}`,
		);
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

	async deleteServer(
		uuid: string,
		opts?: { force?: boolean; delete_from_provider?: boolean },
	): Promise<{ message: string }> {
		const params = new URLSearchParams();
		if (opts?.force !== undefined) params.set("force", String(opts.force));
		if (opts?.delete_from_provider !== undefined)
			params.set("delete_from_provider", String(opts.delete_from_provider));
		const qs = params.toString();
		return this.request("DELETE", `/servers/${uuid}${qs ? `?${qs}` : ""}`);
	}

	// Docker registry logins (Coolify v4.4+)
	async listServerRegistries(uuid: string): Promise<ServerRegistries> {
		return this.request("GET", `/servers/${uuid}/registries`);
	}

	async loginServerRegistry(
		uuid: string,
		data: { registry: string; username: string; password: string },
	): Promise<{ message: string }> {
		return this.request("POST", `/servers/${uuid}/registries`, data);
	}

	async checkServerRegistry(uuid: string, registry: string): Promise<{ message: string }> {
		return this.request(
			"POST",
			`/servers/${uuid}/registries/${encodeURIComponent(registry)}/check`,
		);
	}

	async logoutServerRegistry(uuid: string, registry: string): Promise<{ message: string }> {
		return this.request("DELETE", `/servers/${uuid}/registries/${encodeURIComponent(registry)}`);
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
	async getDatabaseLogs(
		uuid: string,
		lines: LogLines = 100,
		showTimestamps?: boolean,
	): Promise<LogResponse> {
		return this.request("GET", `/databases/${uuid}/logs?${logQuery(lines, showTimestamps)}`);
	}

	// Database Backups
	async createDatabaseBackup(
		uuid: string,
		data: DatabaseBackupInput & { frequency: string; backup_now?: boolean },
	): Promise<Record<string, unknown>> {
		return this.request("POST", `/databases/${uuid}/backups`, data);
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
		opts?: {
			delete_volumes?: boolean;
			docker_cleanup?: boolean;
			delete_from_coolify_only?: boolean;
		},
	): Promise<{ message: string }> {
		const params = new URLSearchParams();
		if (opts?.delete_volumes !== undefined)
			params.set("delete_volumes", String(opts.delete_volumes));
		if (opts?.docker_cleanup !== undefined)
			params.set("docker_cleanup", String(opts.docker_cleanup));
		if (opts?.delete_from_coolify_only !== undefined)
			params.set("delete_from_coolify_only", String(opts.delete_from_coolify_only));
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
	async getServiceLogs(
		uuid: string,
		lines: LogLines = 100,
		showTimestamps?: boolean,
	): Promise<LogResponse> {
		return this.request("GET", `/services/${uuid}/logs?${logQuery(lines, showTimestamps)}`);
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

	async updateCurrentTeam(data: { is_build_server_fallback_enabled: boolean }): Promise<Team> {
		return this.request<Team>("PATCH", "/team", data);
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
			is_host_file?: boolean;
			fs_path?: string;
		},
	): Promise<{ uuid?: string } & Record<string, unknown>> {
		validateStorageInput(data);
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
		validateStorageInput(data);
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
			is_host_file?: boolean;
			fs_path?: string;
		},
	): Promise<{ uuid?: string } & Record<string, unknown>> {
		validateStorageInput(data);
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
		validateStorageInput(data);
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
			is_host_file?: boolean;
			fs_path?: string;
		},
	): Promise<{ uuid?: string } & Record<string, unknown>> {
		validateStorageInput(data);
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
		validateStorageInput(data);
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

	async getApplicationPreviewLogs(
		uuid: string,
		pullRequestId: number,
		lines: LogLines = 100,
		showTimestamps?: boolean,
		serviceName?: string,
	): Promise<LogResponse> {
		return this.request(
			"GET",
			`/applications/${uuid}/previews/${pullRequestId}/logs?${logQuery(lines, showTimestamps, serviceName)}`,
		);
	}

	// Preview deployments (Coolify v4.4+)
	async listApplicationPreviews(uuid: string): Promise<ApplicationPreview[]> {
		return this.request<ApplicationPreview[]>("GET", `/applications/${uuid}/previews`);
	}

	async getApplicationPreview(uuid: string, pullRequestId: number): Promise<ApplicationPreview> {
		return this.request<ApplicationPreview>(
			"GET",
			`/applications/${uuid}/previews/${pullRequestId}`,
		);
	}

	async deployApplicationPreview(
		uuid: string,
		data: PreviewDeployInput,
	): Promise<{ message: string; deployment_uuid: string | null; preview: ApplicationPreview }> {
		if (
			data.docker_tag !== undefined &&
			(data.git_type !== undefined || data.commit !== undefined)
		) {
			throw new Error(
				"docker_tag is for Docker Image applications; git_type and commit are for Git applications. Do not combine them.",
			);
		}
		if (data.git_type === "bitbucket" && data.commit === undefined) {
			throw new Error("commit is required when git_type is bitbucket.");
		}
		return this.request("POST", `/applications/${uuid}/previews`, data);
	}

	async updateApplicationPreview(
		uuid: string,
		pullRequestId: number,
		data: PreviewDomainsInput,
	): Promise<Record<string, unknown>> {
		if ((data.domains !== undefined) === (data.docker_compose_domains !== undefined)) {
			throw new Error("Provide exactly one of domains or docker_compose_domains.");
		}
		return this.request("PATCH", `/applications/${uuid}/previews/${pullRequestId}`, data);
	}

	async deleteApplicationPreview(
		uuid: string,
		pullRequestId: number,
	): Promise<{ message: string }> {
		return this.request("DELETE", `/applications/${uuid}/previews/${pullRequestId}`);
	}

	async getInstanceEmailSettings(): Promise<InstanceEmailSettings> {
		return this.request("GET", "/settings/email");
	}

	async updateInstanceEmailSettings(data: InstanceEmailSettings): Promise<InstanceEmailSettings> {
		return this.request("PATCH", "/settings/email", data);
	}

	// Database imports (Coolify v4.4+)
	async createDatabaseImport(uuid: string, data: DatabaseImportInput): Promise<DatabaseImport> {
		validateImportInput(data);
		return this.request("POST", `/databases/${uuid}/imports`, data);
	}

	async getDatabaseImport(uuid: string, activityId: number): Promise<DatabaseImport> {
		return this.request("GET", `/databases/${uuid}/imports/${activityId}`);
	}

	async createServiceDatabaseImport(
		uuid: string,
		databaseUuid: string,
		data: DatabaseImportInput,
	): Promise<DatabaseImport> {
		validateImportInput(data);
		return this.request("POST", `/services/${uuid}/databases/${databaseUuid}/imports`, data);
	}

	async getServiceDatabaseImport(
		uuid: string,
		databaseUuid: string,
		activityId: number,
	): Promise<DatabaseImport> {
		return this.request("GET", `/services/${uuid}/databases/${databaseUuid}/imports/${activityId}`);
	}

	// Secret managers (Coolify v4.4+)
	async createIntegrationToken(data: IntegrationTokenInput): Promise<{ uuid: string }> {
		if (data.provider === "doppler" && !/^dp\.(st|sa)\./.test(data.token)) {
			throw new Error("A Doppler token must start with dp.st. or dp.sa.");
		}
		if (data.provider !== "doppler" && !data.metadata?.base_url) {
			throw new Error(`metadata.base_url is required for ${data.provider}.`);
		}
		if (data.provider === "infisical" && !data.metadata?.client_id) {
			throw new Error("metadata.client_id is required for infisical.");
		}
		return this.request<{ uuid: string }>("POST", "/security/integration-tokens", data);
	}

	async updateApplicationSecretManager(
		uuid: string,
		data: SecretManagerLinkInput,
	): Promise<Record<string, unknown>> {
		return this.request("PATCH", `/applications/${uuid}/secret-manager`, data);
	}

	// Audit log (Coolify v4.4+)
	async listAuditEvents(filter: AuditEventFilter = {}): Promise<AuditEventPage> {
		const params = new URLSearchParams();
		for (const [key, value] of Object.entries(filter)) {
			if (value !== undefined) params.set(key, String(value));
		}
		const qs = params.toString();
		return this.request("GET", `/audit-events${qs ? `?${qs}` : ""}`);
	}

	// Resources (aggregate)
	async listResources(): Promise<unknown[]> {
		return this.request<unknown[]>("GET", "/resources");
	}
}
