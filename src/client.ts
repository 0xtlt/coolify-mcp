import type { Config } from "./config";
import { CoolifyApiError, NetworkError } from "./lib/errors";
import type {
	Application,
	Database,
	Deployment,
	Environment,
	EnvironmentVariable,
	PrivateKey,
	Project,
	ServerInfo,
	Service,
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

	async stopApplication(uuid: string): Promise<{ message: string }> {
		return this.request("POST", `/applications/${uuid}/stop`);
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

	async deleteServer(uuid: string): Promise<{ message: string }> {
		return this.request("DELETE", `/servers/${uuid}`);
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

	async stopDatabase(uuid: string): Promise<{ message: string }> {
		return this.request("GET", `/databases/${uuid}/stop`);
	}

	async restartDatabase(uuid: string): Promise<{ message: string }> {
		return this.request("GET", `/databases/${uuid}/restart`);
	}

	async updateDatabase(uuid: string, data: Record<string, unknown>): Promise<Database> {
		return this.request<Database>("PATCH", `/databases/${uuid}`, data);
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

	async stopService(uuid: string): Promise<{ message: string }> {
		return this.request("POST", `/services/${uuid}/stop`);
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
}
