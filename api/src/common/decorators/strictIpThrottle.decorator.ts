import { SetMetadata } from '@nestjs/common';

/**
 * Pre-auth routes (login, TOTP, contact) key their throttle budget on the IP
 * only, never on a caller-supplied token, so rotating tokens can't buy a fresh
 * bucket. Same decorator as Examination's PA-1 `@StrictIpThrottle()`.
 */
export const STRICT_IP_THROTTLE_KEY = 'strictIpThrottle';
export const StrictIpThrottle = () => SetMetadata(STRICT_IP_THROTTLE_KEY, true);
