export class CoolifyMcpError extends Error {
	constructor(
		message: string,
		public readonly code: string,
	) {
		super(message);
		this.name = "CoolifyMcpError";
	}
}

export class CoolifyApiError extends CoolifyMcpError {
	constructor(
		message: string,
		public readonly statusCode: number,
		public readonly responseBody?: string,
	) {
		super(message, "API_ERROR");
		this.name = "CoolifyApiError";
	}

	toUserMessage(): string {
		const detail = this.responseBody ? ` Response: ${this.responseBody}` : "";
		switch (this.statusCode) {
			case 401:
				return `Authentication failed. Check your COOLIFY_TOKEN.${detail}`;
			case 403:
				return `Access denied. Insufficient permissions.${detail}`;
			case 404:
				return `Resource not found. Check the ID provided.${detail}`;
			case 429:
				return `Rate limit exceeded. Try again later.${detail}`;
			default:
				return `API error (${this.statusCode}): ${this.message}${detail}`;
		}
	}
}

export class NetworkError extends CoolifyMcpError {
	constructor(message: string) {
		super(message, "NETWORK_ERROR");
		this.name = "NetworkError";
	}
}

export class ConfigurationError extends CoolifyMcpError {
	constructor(message: string) {
		super(message, "CONFIG_ERROR");
		this.name = "ConfigurationError";
	}
}
