// RabbitMQ topology (vhost `portfolio` in production, PLAN §0).
// One durable topic exchange; the API is both publisher and consumer.
export const EVENTS_EXCHANGE = 'pf.events';
export const EVENTS_EXCHANGE_TYPE = 'topic';
export const EVENTS_QUEUE = 'pf.api.events';
export const EVENTS_DLX = 'pf.events.dlx';
export const EVENTS_DLQ = 'pf.api.events.dlq';

/** Routing keys. Payload shapes live next to their consumers (Phase 4/8). */
export const EVENTS = {
    CONTACT_RECEIVED: 'contact.received',
    MEDIA_UPLOADED: 'media.uploaded',
    CONTENT_CHANGED: 'content.changed',
} as const;
export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
