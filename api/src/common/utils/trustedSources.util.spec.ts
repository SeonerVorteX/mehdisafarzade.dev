import { isTrustedSource, normalizeIp, parseTrustedSources } from './trustedSources.util';

// The production plan (PLAN §9.2): gateway + admin blue/green, nothing else.
const PROD = parseTrustedSources('10.231.0.1, 10.231.0.31,10.231.0.32');

describe('trusted sources', () => {
    it('parses the production list', () => {
        expect(PROD.errors).toEqual([]);
        expect([...PROD.ips]).toEqual(['10.231.0.1', '10.231.0.31', '10.231.0.32']);
    });

    it.each([
        ['10.231.0.1', true, 'portfolio gateway = host nginx'],
        ['::ffff:10.231.0.1', true, 'IPv4-mapped gateway'],
        ['10.231.0.31', true, 'admin blue'],
        ['10.231.0.32', true, 'admin green'],
        ['10.231.0.21', false, 'web blue'],
        ['10.231.0.22', false, 'web green'],
        ['10.231.0.11', false, 'api itself'],
        ['10.231.0.250', false, 'anything else on the portfolio network'],
        ['172.18.0.5', false, 'backend network (Examination containers)'],
        ['127.0.0.1', false, 'loopback is not trusted in production'],
        ['', false, 'no address'],
        [undefined, false, 'undefined'],
    ])('%s → %s (%s)', (addr, expected, _label) => {
        expect(isTrustedSource(addr, PROD.ips)).toBe(expected);
    });

    it('rejects CIDR ranges and garbage', () => {
        const { ips, errors } = parseTrustedSources('10.231.0.0/24, not-an-ip, 10.231.0.1');
        expect([...ips]).toEqual(['10.231.0.1']);
        expect(errors).toHaveLength(2);
        expect(errors[0]).toMatch(/CIDR/);
    });

    it('normalizes IPv6', () => {
        expect(normalizeIp('FE80::1%eth0')).toBe('fe80::1');
        expect(isTrustedSource('::1', parseTrustedSources('::1').ips)).toBe(true);
    });
});
