import { signRevalidation } from './revalidation.service';

describe('signRevalidation', () => {
    it('matches the web route (shared test vector)', () => {
        // The same vector is asserted in frontend/apps/web/src/lib/revalidate.test.ts.
        expect(signRevalidation('{"tags":["posts"]}', '1800000000', 'test-secret-test-secret-test-secret')).toBe(
            '6808efcc46b89e0bf8d63e08520e17b4d3d91b0f0077d0650adbc4cd0d8a494c',
        );
    });
});
