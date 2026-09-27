# Device gate

`admin.mehdisafarzade.dev` answers **only** to browsers that hold an enrolled device cookie. nginx checks it before any admin page, asset (`/_next/*`), or admin API call (`/api/*`) is served. Everyone else gets a plain `404`, exactly like a path that doesn't exist. The admin panel still has its own login (email + password, then TOTP) behind the gate.

- Enforced by `deploy/nginx/conf.d/device-gate.conf` (maps) and `deploy/nginx/snippets/device-gate.conf` (the check). Both are generic and can be reused for other sites.
- Tested by `deploy/nginx/test/run.sh` (60 checks, runs in CI).
- Managed with `gate.ps1` (PowerShell 5.1+, Windows). It talks to the server over `ssh root@examination`, or to the local dev gate container with `-Target local`.

## How it works

| Piece | Where | Secret? |
|---|---|---|
| `__Host-dg` cookie: 256-bit token, `Secure; HttpOnly; SameSite=Lax; Path=/`, no `Domain`, 1 year | your browser | yes |
| `<host>.map`: `"<host>:<token>" <device>;  # enrolled <date>` | `/etc/nginx/device-gate/` on the server, root `0600` | **yes, and only here** |
| `<host>.unlock`: `"<host>:<one-time key>" <token>;` | same dir, **only during an enrollment** | yes |
| `.local/devices.json`: device names + dates | this folder, git-ignored | no |

Each device (really, each **browser profile**) has its own token, so you can revoke the laptop without touching the PC. nginx passes the device name to the admin app and the API as `X-Admin-Device`, and every admin session and audit log entry records it.

## Everyday use (PowerShell, from this folder)

```powershell
.\gate.ps1 enroll -Device pc          # opens https://admin.mehdisafarzade.dev/__dg/unlock?k=... in your default browser
.\gate.ps1 enroll -Device laptop      # run it on the laptop (same SSH access), or:
.\gate.ps1 enroll -Device laptop -PrintUrl   # print the link and open it by hand in the right browser/profile
.\gate.ps1 list                       # device names + enrollment dates (tokens never leave the server)
.\gate.ps1 revoke -Device laptop      # that browser immediately gets 404
.\gate.ps1 rotate -Device pc          # new token for pc, then re-enroll (the old cookie stops working)
```

### Device names

Lowercase letters, digits and `-`, starting with a letter or digit, at most 32 characters: `^[a-z0-9][a-z0-9-]{0,31}$`. The check is **case-sensitive**: `-Device LAPTOP` is rejected (with a "did you mean `laptop`" hint) rather than silently lowercased. nginx forwards the name verbatim as `X-Admin-Device`, and the API accepts only that pattern, so a mis-cased entry would pass the gate and then get 404 on every admin call.

### `list` statuses

`list` shows **every** line of the map, never the tokens, with a status:

| Status | Meaning | Fix |
|---|---|---|
| `OK` | valid entry | none |
| `INVALID_NAME` | e.g. `LAPTOP`: passes nginx, 404 from the API | `revoke -Device LAPTOP -Force`, then enroll a valid name |
| `MALFORMED:token` / `MALFORMED:host-or-quotes` / `MALFORMED:syntax` | a hand-edited or damaged line | `revoke -Device <name> -Force` |

If a broken line makes nginx reject the whole map, `list` says so. Remove that line first (`revoke … -Force`). `-Force` only relaxes the naming rule (it still refuses shell-unsafe characters), and names stay case-sensitive.

What `enroll` does:
1. Generates a token and a one-time unlock key locally.
2. Sends them to the server **over stdin** (never on a command line) and appends them to the maps.
3. Runs `nginx -t`, then reloads. If the check fails, it restores the previous maps and exits.
4. Opens the unlock link. nginx sets the cookie and redirects to `/`.
5. Watches a secret-free log line (`time host device status`) to see the link being used, or stops waiting when you press Enter or after `-TimeoutSec`.
6. **Always** deletes the unlock key again (even on Ctrl+C) and reloads. Outside an enrollment, no unlock link works.

If the gate config isn't installed on the target yet (before the Phase 9 deploy), the script says so and changes nothing.

## Local development gate

The same gate runs in front of the local admin app so the whole flow can be tried without touching the server:

```powershell
.\gate.ps1 up -Target local                   # nginx:1.24 on https://localhost:8443 (self-signed cert, created once)
.\gate.ps1 enroll -Device pc -Target local    # enroll this browser
.\gate.ps1 list -Target local
.\gate.ps1 down -Target local
```

- `https://localhost:8443/api/*` → `http://localhost:3100/v1/admin/*` (API), and everything else → `http://localhost:5603` (admin `next dev`, including hot reload).
- The certificate is self-signed. When the browser warns, choose **Advanced → Proceed to localhost** once. (Optionally, trust `deploy/nginx/dev/.certs/localhost.pem` in your user certificate store yourself. The script never changes system trust.)
- Local maps live in `deploy/nginx/dev/.gate/` (git-ignored).

## When the cookie is gone

The cookie belongs to one browser profile on one host. You'll need to enroll again (usually `rotate`, so the old token is also invalidated) when you:

- **clear cookies / site data** for the admin host,
- use **another browser**, or **another profile** of the same browser (each profile is its own device, so give it its own name, e.g. `pc-firefox`),
- use a **private/incognito window**: its cookies vanish when the window closes. Prefer not to use the admin from incognito at all; if you must, enroll it as a throwaway device name and revoke it afterwards,
- reach the **1-year expiry**.

## Lost or stolen laptop

From the PC: `.\gate.ps1 revoke -Device laptop`. The laptop gets 404 at once. Then sign in to the admin and revoke the laptop's sessions (Settings → Sessions); they're bound to the device name anyway. If the laptop also had your SSH key, remove it from the server's `authorized_keys` too.

## Adding the gate to another site (e.g. examination-admin)

1. In that site's nginx `server {}`, add `include /etc/nginx/snippets/device-gate.conf;` before its locations, and forward `proxy_set_header X-Admin-Device $dg_device;` to its upstreams. `conf.d/device-gate.conf` is shared and needs no change: its maps are keyed on `$host`.
2. **Make sure its upstreams are not reachable around nginx** (published on `127.0.0.1` only). A gate in front of a port that's also open to the internet protects nothing.
3. Add an entry in `sites.psd1` (a commented example is already there) and run `.\gate.ps1 enroll -Site examination-admin -Device pc`.
4. Add a Cloudflare Cache Rule bypassing that host's cache, as for `admin.mehdisafarzade.dev`.

## Security notes

- A request without a valid cookie gets nginx's own 404, the same body as any unknown path. We use `404` rather than `444` because behind Cloudflare a `444` shows up as a 520 error, which hints that something is there.
- The unlock request is written to its own secret-free log only (`/var/log/nginx/device-gate.log`: time, host, device, status). The standard access log never sees it.
- `map_hash_bucket_size 128` is required. The keys (`host:token`) are longer than nginx's 64-byte default, and without it nginx refuses to load. The harness caught this.
