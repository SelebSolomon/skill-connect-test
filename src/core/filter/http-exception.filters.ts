import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const isClientError = status >= 400 && status < 500;
    const isServerError = status >= 500;

    // ── Log server errors in full — never send these to the client ────────────
    if (isServerError) {
      this.logger.error(
        `[${request.method}] ${request.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    // ── Log client errors lightly (optional — remove if too noisy) ────────────
    if (isClientError) {
      this.logger.warn(`[${request.method}] ${request.url} → ${status}`);
    }

    // ── Build client-facing response ──────────────────────────────────────────
    response.status(status).json({
      success: false,
      statusCode: status,
      message: isServerError
        ? 'Something went wrong. Please try again later.' // never leak internals
        : this.extractClientMessage(exception), // safe for 4xx
      ...(this.hasMultipleErrors(exception) && {
        errors: this.extractMessages(exception), // validation array
      }),
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private extractClientMessage(exception: unknown): string {
    if (!(exception instanceof HttpException)) return 'An error occurred';

    const res = exception.getResponse();
    if (typeof res === 'string') return res;

    const messages = (res as any)?.message;
    if (Array.isArray(messages) && messages.length > 1)
      return 'Validation failed';
    if (Array.isArray(messages)) return messages[0];
    if (typeof messages === 'string') return messages;

    return exception.message ?? 'An error occurred';
  }

  private extractMessages(exception: unknown): string[] | undefined {
    if (!(exception instanceof HttpException)) return undefined;
    const res = exception.getResponse();
    const messages = (res as any)?.message;
    return Array.isArray(messages) && messages.length > 1
      ? messages
      : undefined;
  }

  private hasMultipleErrors(exception: unknown): boolean {
    if (!(exception instanceof HttpException)) return false;
    const res = exception.getResponse();
    const messages = (res as any)?.message;
    return Array.isArray(messages) && messages.length > 1;
  }
}
