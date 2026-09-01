import { logger } from '../observability/logger.js';

export class SecurityDefense {
  private static INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
    /disregard\s+(all\s+)?(previous|prior)\s+rules/i,
    /system\s*:\s*override/i,
    /you\s+are\s+now\s+(in\s+)?(developer|dan|jailbreak)\s+mode/i,
    /reveal\s+(your\s+)?system\s+prompt/i,
    /drop\s+table\s+/i,
    /<script[\s\S]*?>[\s\S]*?<\/script>/i,
    /curl\s+http:\/\/169\.254/i,
  ];

  /**
   * Sanitizes user input and detects potential injection attempts.
   */
  sanitizeUserInput(input: string): { sanitized: string; isInjected: boolean; flags: string[] } {
    const flags: string[] = [];
    let isInjected = false;

    for (const pattern of SecurityDefense.INJECTION_PATTERNS) {
      if (pattern.test(input)) {
        isInjected = true;
        flags.push(pattern.source);
        logger.warn({ pattern: pattern.source }, 'Prompt injection attempt detected in input');
      }
    }

    // Strip unsafe control characters and script tags
    let sanitized = input
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    return { sanitized, isInjected, flags };
  }

  /**
   * Wraps retrieved untrusted documents in strict data tags with clear prompt boundaries.
   */
  wrapUntrustedData(content: string, sourceId: string): string {
    // Neutralize any attempted tag injection
    const cleanContent = content
      .replace(/<\/?untrusted_context>/gi, '')
      .replace(/<\/?system_instructions>/gi, '');

    return `\n<untrusted_context id="${sourceId}">\n${cleanContent}\n</untrusted_context>\n`;
  }

  /**
   * SSRF Protection: prevents outbound tool calls from reaching private networks or loopback.
   */
  isSafeUrl(rawUrl: string): boolean {
    try {
      const parsed = new URL(rawUrl);
      const hostname = parsed.hostname.toLowerCase();

      // Disallow loopback and metadata addresses
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname === '0.0.0.0' ||
        hostname === '169.254.169.254' ||
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
      ) {
        logger.warn({ hostname }, 'Blocked unsafe internal URL / SSRF target');
        return false;
      }

      return parsed.protocol === 'https:' || (process.env.APP_ENV === 'development' && parsed.protocol === 'http:');
    } catch {
      return false;
    }
  }
}

export const security = new SecurityDefense();
