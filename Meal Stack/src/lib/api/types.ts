export interface ApiMeta {
  timestamp?: string;
  traceId?: string;
}

export interface ApiErrorShape {
  code?: string;
  details?: unknown;
}

export interface ApiEnvelope<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: ApiMeta;
}

export interface ApiFailure {
  success: false;
  message: string;
  code: string;
  status: number;
  details?: unknown;
  traceId?: string;
}

export class AppApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  traceId?: string;

  constructor(failure: ApiFailure) {
    super(failure.message);
    this.name = 'AppApiError';
    this.code = failure.code;
    this.status = failure.status;
    this.details = failure.details;
    this.traceId = failure.traceId;
  }
}
