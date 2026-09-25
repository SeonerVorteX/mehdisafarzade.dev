import { HealthController } from './health.controller';

describe('HealthController', () => {
    it('reports ok with an ISO timestamp', () => {
        const res = new HealthController().check();
        expect(res.status).toBe('ok');
        expect(new Date(res.timestamp).toISOString()).toBe(res.timestamp);
    });
});
