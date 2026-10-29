/**
 * Everything you need to change lives in this file.
 * Nothing else in the project needs editing to go live.
 */

/**
 * The n8n *Production* webhook URL.
 * In n8n: open the Webhook node -> copy the "Production URL" -> paste it here.
 */
export const WEBHOOK_URL = 'https://samuilautexp.app.n8n.cloud/webhook/orders-processor';

/**
 * true  = the app fakes the answers so you can click through the UI without n8n.
 * false = the app really calls WEBHOOK_URL.
 * Set this to false once the webhook URL above is filled in.
 */
export const MOCK_MODE = false;

/**
 * How long to wait for n8n before giving up, in milliseconds.
 * The AI agent normally answers in 10-40 seconds, so 90 seconds is a safe ceiling.
 */
export const REQUEST_TIMEOUT_MS = 90_000;

/** Largest image the employee may attach, in bytes (5 MB). */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Image formats n8n can read. */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
