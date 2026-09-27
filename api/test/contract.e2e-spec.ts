import { buildOpenApi } from 'src/app.setup';
import { createTestApp, type TestApp } from './utils/app';

/**
 * API contract snapshot (PLAN §7): every route + method (query params too, once DTOs carry @ApiProperty).
 * `frontend/packages/api` is hand-maintained, so an unreviewed route change must
 * fail CI here. After an intended change: `yarn test:e2e -u` and review the diff.
 */
describe('API contract (e2e)', () => {
    let app: TestApp;

    beforeAll(async () => {
        app = await createTestApp();
    });

    afterAll(async () => {
        await app.close();
    });

    it('matches the committed route snapshot', () => {
        const doc = buildOpenApi(app);
        const routes = Object.entries(doc.paths)
            .flatMap(([path, item]) =>
                Object.entries(item as Record<string, { parameters?: { name: string; in: string }[] }>)
                    .filter(([method]) => ['get', 'post', 'put', 'patch', 'delete'].includes(method))
                    .map(([method, op]) => {
                        const params = (op.parameters ?? [])
                            .filter((p) => p.in === 'query')
                            .map((p) => p.name)
                            .sort();
                        return `${method.toUpperCase().padEnd(6)} ${path}${params.length ? ` ?${params.join('&')}` : ''}`;
                    }),
            )
            .sort();
        expect(routes).toMatchSnapshot();
    });
});
