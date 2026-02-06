import type { Config } from "./config";
import { CoolifyApiError, NetworkError } from "./lib/errors";
import type { Application, Deployment, ServerInfo } from "./types/api";

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
			return JSON.parse(text) as T;
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
}
