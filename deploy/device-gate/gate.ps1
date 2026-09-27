<#
.SYNOPSIS
    Device gate: enroll, revoke, list or rotate the browsers allowed to reach an
    nginx-gated admin host (PLAN.md section 8). See README.md next to this file.

.DESCRIPTION
    Tokens are generated here, sent to the server over stdin (never as command-line
    arguments), and stored ONLY in the server-side map files. Nothing secret is
    written to this repo or to .local/. Every change is checked with `nginx -t`
    before a reload; if the check fails, the previous map files are restored.

    Device names are lowercase: ^[a-z0-9][a-z0-9-]{0,31}$ (checked case-sensitively).
    nginx forwards the name verbatim as X-Admin-Device and the API accepts only
    that pattern, so e.g. "LAPTOP" would pass the gate and then get 404 everywhere.

.EXAMPLE
    .\gate.ps1 up -Target local                  # start the local dev gate (https://localhost:8443)
    .\gate.ps1 enroll -Device pc -Target local   # enroll this browser against the local gate
    .\gate.ps1 enroll -Device pc                 # production (admin.mehdisafarzade.dev), opens the browser
    .\gate.ps1 enroll -Device phone -PrintUrl    # print the one-time link instead of opening it
    .\gate.ps1 list                              # every entry, malformed ones flagged
    .\gate.ps1 revoke -Device laptop
    .\gate.ps1 revoke -Device LAPTOP -Force      # remove an entry whose name doesn't follow the rules
    .\gate.ps1 rotate -Device pc                 # new token for pc + re-enroll
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateSet('enroll', 'revoke', 'list', 'rotate', 'up', 'down')]
    [string]$Command,

    [string]$Site = 'portfolio-admin',

    # Validated in code (case-sensitive), not with ValidatePattern: PowerShell's
    # ValidatePattern is case-insensitive, which let "LAPTOP" through.
    [string]$Device,

    [ValidateSet('remote', 'local')]
    [string]$Target = 'remote',

    [switch]$PrintUrl,

    # revoke only: accept a name that doesn't follow the naming rules (legacy/malformed entries).
    [switch]$Force,

    [ValidateRange(5, 900)]
    [int]$TimeoutSec = 180,

    # Overrides for tests (deploy/device-gate/test/test-gate.ps1).
    [string]$LocalContainer = 'portfolio-gate-dev',
    [string]$LocalBaseUrl = 'https://localhost:8443',
    [string]$StateDir
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$DeviceRule = '^[a-z0-9][a-z0-9-]{0,31}$'
# With -Force: still only characters that are safe inside sh single quotes and awk -v.
$ForceRule = '^[A-Za-z0-9._-]{1,64}$'

$scriptDir = $PSScriptRoot
$repoRoot = (Resolve-Path (Join-Path (Join-Path $scriptDir '..') '..')).Path
$devGateDir = Join-Path (Join-Path (Join-Path $repoRoot 'deploy') 'nginx') 'dev'
if (-not $StateDir) { $StateDir = Join-Path $scriptDir '.local' }
$stateFile = Join-Path $StateDir 'devices.json'

$sites = Import-PowerShellDataFile (Join-Path $scriptDir 'sites.psd1')
if (-not $sites.ContainsKey($Site)) {
    throw "Unknown site '$Site'. Known sites: $($sites.Keys -join ', ')"
}
$siteCfg = $sites[$Site]

if ($Target -eq 'local') {
    $gateHost = 'localhost'
    $baseUrl = $LocalBaseUrl.TrimEnd('/')
    $mapDir = '/etc/nginx/device-gate'
    $enrollLog = '/var/log/nginx/device-gate.log'
    $strict = '0' # bind mount on Windows: chmod is not meaningful
} else {
    $gateHost = $siteCfg.Host
    $baseUrl = "https://$($siteCfg.Host)"
    $mapDir = $siteCfg.RemoteDir
    $enrollLog = $siteCfg.EnrollLog
    $strict = '1'
}

# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

function Assert-Device([switch]$AllowForce) {
    if (-not $Device) { throw "-Device is required for '$Command' (e.g. -Device pc)." }
    if ($Device -cmatch $DeviceRule) { return }
    if ($AllowForce -and $Force) {
        if ($Device -cmatch $ForceRule) { return }
        throw "Invalid device name '$Device': even with -Force only letters, digits, '.', '_' and '-' (max 64) are accepted."
    }
    $msg = "Invalid device name '$Device'. Device names must be lowercase letters, digits and '-', start with a letter or digit, max 32 chars ($DeviceRule)."
    if ($Device -cmatch '[A-Z]') {
        $msg += " Uppercase is rejected, not lowercased: nginx would forward it verbatim and the admin API would answer 404. Did you mean '$($Device.ToLowerInvariant())'?"
    }
    if ($AllowForce) { $msg += " To remove an existing entry with a non-conforming name, add -Force." }
    throw $msg
}

function New-GateSecret {
    # 32 random bytes -> base64url without padding (43 chars), matching the nginx cookie regex.
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

function Invoke-Native([scriptblock]$Block) {
    # Windows PowerShell 5.1 turns any native stderr output into a terminating error
    # under ErrorActionPreference=Stop (openssl prints progress there). Run it with
    # Continue and judge success by the exit code instead.
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { & $Block 2>&1 | Out-Null } finally { $ErrorActionPreference = $prev }
    return $LASTEXITCODE
}

function Format-Script([string]$Template, [hashtable]$Values) {
    $s = $Template
    foreach ($k in $Values.Keys) { $s = $s.Replace("__$($k)__", [string]$Values[$k]) }
    return $s
}

function Invoke-Gate([string]$ShellScript) {
    # The script (which may contain a token) travels on stdin, never in argv.
    $body = ($ShellScript -replace "`r", '') + "`n"
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        if ($Target -eq 'local') {
            $out = $body | & docker exec -i $LocalContainer sh -c "tr -d '\r' | sh -s"
        } else {
            $out = $body | & ssh -o BatchMode=yes -o ConnectTimeout=15 $siteCfg.Ssh "tr -d '\r' | sh -s"
        }
        $code = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $prev
    }
    return [pscustomobject]@{ Code = $code; Output = ((@($out) | ForEach-Object { "$_" }) -join "`n") }
}

function Get-State {
    if (-not (Test-Path $stateFile)) { return @() }
    $raw = Get-Content $stateFile -Raw
    if (-not $raw -or -not $raw.Trim()) { return @() }
    # PowerShell 5.1 turns "[ ]" into a single $null item; keep only real entries.
    return @(@($raw | ConvertFrom-Json) | Where-Object { $null -ne $_ -and $_.PSObject.Properties['device'] })
}

function Save-State($Items) {
    if (-not (Test-Path $StateDir)) { New-Item -ItemType Directory -Path $StateDir | Out-Null }
    ConvertTo-Json -InputObject @($Items) -Depth 3 | Set-Content -Path $stateFile -Encoding UTF8
}

function Update-State([string]$Action) {
    $items = @(Get-State | Where-Object { -not ($_.site -eq $Site -and $_.target -eq $Target -and $_.device -ceq $Device) })
    if ($Action -eq 'add') {
        $items += [pscustomobject]@{
            site       = $Site
            target     = $Target
            host       = $gateHost
            device     = $Device
            enrolledAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
        }
    }
    Save-State $items
}

# ---------------------------------------------------------------------------
# shell scripts (POSIX sh + awk, run as root on the server / in the container).
# Map lines are parsed by FIELD with exact comparisons (awk), never with
# regexes that assume a character class for device names:
#   $1 = "<host>:<token>"   $2 = <device>;   $3 $4 $5 = # enrolled <date>
# ---------------------------------------------------------------------------

$preflight = @'
# Read the config files directly: `nginx -T` fails exactly when a map line is broken,
# which is when revoke/list are needed most.
if ! grep -rqsF 'device-gate/*.map' /etc/nginx/nginx.conf /etc/nginx/conf.d /etc/nginx/sites-enabled; then
    echo "GATE_NOT_INSTALLED"
    exit 5
fi
'@

# exit 0 when "$H"/"$DEV" has an entry in "$MAP"
$awkHasDevice = @'
has_device() {
    awk -v h="$H" -v d="$DEV" '{ sub(/\r$/, "") } index($1, "\"" h ":") == 1 && ($2 == d ";" || $2 == d) { f = 1 } END { exit !f }' "$MAP"
}
'@

$enrollTemplate = @'
exec 2>&1
set -eu
umask 077
__PREFLIGHT__
D='__DIR__'; H='__HOST__'; DEV='__DEVICE__'; TOK='__TOKEN__'; KEY='__KEY__'; NOW='__NOW__'; LOG='__LOG__'; STRICT='__STRICT__'
__AWK_HAS_DEVICE__
case "$DEV" in
    ''|-*|*[!a-z0-9-]*) echo "GATE_BAD_NAME"; exit 6 ;;
esac
mkdir -p "$D"
chmod 700 "$D" 2>/dev/null || [ "$STRICT" = 0 ]
MAP="$D/$H.map"; UNL="$D/$H.unlock"
[ -f "$MAP" ] || : > "$MAP"
[ -f "$UNL" ] || : > "$UNL"
if has_device; then echo "GATE_EXISTS"; exit 3; fi
cp -p "$MAP" "$MAP.bak"; cp -p "$UNL" "$UNL.bak"
printf '"%s:%s" %s; # enrolled %s\n' "$H" "$TOK" "$DEV" "$NOW" >> "$MAP"
printf '"%s:%s" %s;\n' "$H" "$KEY" "$TOK" >> "$UNL"
chmod 600 "$MAP" "$UNL" 2>/dev/null || [ "$STRICT" = 0 ]
LINES=0
if [ -f "$LOG" ]; then LINES=$(wc -l < "$LOG" | tr -d ' '); fi
if nginx -t >/dev/null 2>&1; then
    nginx -s reload >/dev/null 2>&1
    rm -f "$MAP.bak" "$UNL.bak"
    echo "GATE_OK $LINES"
else
    cat "$MAP.bak" > "$MAP"; cat "$UNL.bak" > "$UNL"; rm -f "$MAP.bak" "$UNL.bak"
    nginx -t >/dev/null 2>&1 && nginx -s reload >/dev/null 2>&1
    echo "GATE_NGINX_TEST_FAILED"
    exit 4
fi
'@

$pollTemplate = @'
exec 2>&1
LOG='__LOG__'; H='__HOST__'; DEV='__DEVICE__'; FROM='__FROM__'
if [ -f "$LOG" ] && awk -v from="$FROM" -v h="$H" -v d="$DEV" 'NR > from && $2 == h && $3 == d && $4 == "302" { f = 1 } END { exit !f }' "$LOG"; then
    echo "GATE_ENROLLED"
else
    echo "GATE_WAITING"
fi
'@

$removeUnlockTemplate = @'
exec 2>&1
set -eu
D='__DIR__'; H='__HOST__'; KEY='__KEY__'
UNL="$D/$H.unlock"
[ -f "$UNL" ] || exit 0
grep -v -F "\"$H:$KEY\"" "$UNL" > "$UNL.tmp" || true
cat "$UNL.tmp" > "$UNL"
rm -f "$UNL.tmp"
nginx -t >/dev/null 2>&1 && nginx -s reload >/dev/null 2>&1 && echo "GATE_UNLOCK_REMOVED"
'@

$revokeTemplate = @'
exec 2>&1
set -eu
umask 077
__PREFLIGHT__
D='__DIR__'; H='__HOST__'; DEV='__DEVICE__'
__AWK_HAS_DEVICE__
MAP="$D/$H.map"; UNL="$D/$H.unlock"
if [ ! -f "$MAP" ] || ! has_device; then echo "GATE_NOT_FOUND"; exit 3; fi
TOKS=$(mktemp)
# the token(s) of this device, to also drop any unlock line that would hand them out
awk -v h="$H" -v d="$DEV" '{ sub(/\r$/, "") } index($1, "\"" h ":") == 1 && ($2 == d ";" || $2 == d) { print substr($1, length(h) + 3, length($1) - length(h) - 3) }' "$MAP" > "$TOKS"
cp -p "$MAP" "$MAP.bak"
awk -v h="$H" -v d="$DEV" '{ sub(/\r$/, "") } !(index($1, "\"" h ":") == 1 && ($2 == d ";" || $2 == d))' "$MAP" > "$MAP.new"
cat "$MAP.new" > "$MAP"; rm -f "$MAP.new"
if [ -f "$UNL" ] && [ -s "$TOKS" ]; then
    grep -v -F -f "$TOKS" "$UNL" > "$UNL.new" || true
    cat "$UNL.new" > "$UNL"; rm -f "$UNL.new"
fi
rm -f "$TOKS"
if nginx -t >/dev/null 2>&1; then
    nginx -s reload >/dev/null 2>&1
    rm -f "$MAP.bak"
    echo "GATE_REVOKED"
else
    cat "$MAP.bak" > "$MAP"; rm -f "$MAP.bak"
    nginx -t >/dev/null 2>&1 && nginx -s reload >/dev/null 2>&1
    echo "GATE_NGINX_TEST_FAILED"
    exit 4
fi
'@

# Every non-comment line is reported (device, date, status) so malformed entries
# can't hide. Tokens never leave the server: a "device" that looks like a secret
# is printed as <hidden>.
$listTemplate = @'
exec 2>&1
D='__DIR__'; H='__HOST__'
MAP="$D/$H.map"; UNL="$D/$H.unlock"
[ -f "$MAP" ] || { echo "GATE_EMPTY"; exit 0; }
awk -v h="$H" '
    { sub(/\r$/, "") }
    /^[[:space:]]*$/ || /^[[:space:]]*#/ { next }
    {
        prefix = "\"" h ":"
        ok_host = (index($1, prefix) == 1 && substr($1, length($1), 1) == "\"")
        tok = ok_host ? substr($1, length(h) + 3, length($1) - length(h) - 3) : ""
        dev = $2; sub(/;$/, "", dev)
        if (length(dev) >= 40) dev = "<hidden>"
        if (dev == "") dev = "-"
        date = ($3 == "#" && $4 == "enrolled" && $5 != "") ? $5 : "-"
        status = "OK"
        if (!ok_host) status = "MALFORMED:host-or-quotes"
        else if (length(tok) != 43 || tok !~ /^[A-Za-z0-9_-]+$/) status = "MALFORMED:token"
        else if ($2 !~ /;$/) status = "MALFORMED:syntax"
        else if (dev !~ /^[a-z0-9][a-z0-9-]*$/ || length(dev) > 32) status = "INVALID_NAME"
        printf "GATE_LINE %d %s %s %s\n", NR, dev, date, status
    }' "$MAP"
if [ -s "$UNL" ]; then echo "GATE_PENDING $(grep -c . "$UNL")"; fi
nginx -t >/dev/null 2>&1 || echo "GATE_NGINX_INVALID"
'@

# ---------------------------------------------------------------------------
# commands
# ---------------------------------------------------------------------------

function Invoke-Up {
    if ($Target -ne 'local') { throw "'up' only manages the local dev gate. Use: .\gate.ps1 up -Target local" }
    $certDir = Join-Path $devGateDir '.certs'
    $mapsDir = Join-Path $devGateDir '.gate'
    foreach ($d in @($certDir, $mapsDir)) { if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d | Out-Null } }
    if (-not (Test-Path (Join-Path $certDir 'localhost.pem'))) {
        Write-Host 'Creating a self-signed certificate for https://localhost:8443 ...'
        $code = Invoke-Native {
            docker run --rm -v "$($certDir):/out" alpine/openssl req -x509 -nodes -newkey rsa:2048 -days 825 `
                -subj '/CN=localhost' -addext 'subjectAltName=DNS:localhost,IP:127.0.0.1' `
                -keyout /out/localhost.key -out /out/localhost.pem
        }
        if ($code -ne 0) { throw 'Certificate generation failed (is Docker running?)' }
    }
    $composeFile = Join-Path $devGateDir 'docker-compose.yml'
    $code = Invoke-Native { docker compose -f $composeFile up -d }
    if ($code -ne 0) { throw 'docker compose up failed (is Docker running? is port 8443 free?)' }
    Write-Host ''
    Write-Host 'Local gate is running at https://localhost:8443 (404 until a browser is enrolled).'
    Write-Host 'Next: .\gate.ps1 enroll -Device pc -Target local'
}

function Invoke-Down {
    if ($Target -ne 'local') { throw "'down' only manages the local dev gate. Use: .\gate.ps1 down -Target local" }
    $composeFile = Join-Path $devGateDir 'docker-compose.yml'
    $null = Invoke-Native { docker compose -f $composeFile down }
    Write-Host 'Local gate stopped. Enrolled local devices are kept in deploy/nginx/dev/.gate/.'
}

function Invoke-Enroll {
    Assert-Device
    $token = New-GateSecret
    $key = New-GateSecret
    $now = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    $script = Format-Script $enrollTemplate @{
        PREFLIGHT = $preflight; AWK_HAS_DEVICE = $awkHasDevice; DIR = $mapDir; HOST = $gateHost; DEVICE = $Device
        TOKEN = $token; KEY = $key; NOW = $now; LOG = $enrollLog; STRICT = $strict
    }
    $token = $null
    $r = Invoke-Gate $script
    $script = $null
    if ($r.Output -match 'GATE_NOT_INSTALLED') {
        throw "The gate config is not installed in nginx on this target yet (conf.d/device-gate.conf). Nothing was changed."
    }
    if ($r.Output -match 'GATE_BAD_NAME') { throw "The server rejected device name '$Device'. Nothing was changed." }
    if ($r.Output -match 'GATE_EXISTS') {
        throw "Device '$Device' is already enrolled on $gateHost. Use 'rotate' to issue it a new token, or 'revoke' it first."
    }
    if ($r.Output -notmatch 'GATE_OK (\d+)') {
        throw "Enrollment failed (nothing was left enabled). Output:`n$($r.Output)"
    }
    $fromLine = [int]$Matches[1]
    $url = "$baseUrl/__dg/unlock?k=$key"
    $enrolled = $false
    try {
        if ($PrintUrl) {
            Write-Host 'Open this link ONCE, in the browser profile you want to enroll:'
            Write-Host "  $url"
        } else {
            Write-Host "Opening the one-time enrollment link for '$Device' in your default browser..."
            Start-Process $url
        }
        if ($Target -eq 'local') {
            Write-Host '(Self-signed certificate: if the browser warns, choose Advanced > Proceed to localhost.)'
        }
        Write-Host "Waiting up to $TimeoutSec s for the link to be used. Press Enter to stop waiting."
        $deadline = (Get-Date).AddSeconds($TimeoutSec)
        while ((Get-Date) -lt $deadline) {
            $p = Invoke-Gate (Format-Script $pollTemplate @{ LOG = $enrollLog; HOST = $gateHost; DEVICE = $Device; FROM = $fromLine })
            if ($p.Output -match 'GATE_ENROLLED') { $enrolled = $true; break }
            try {
                if ([Console]::KeyAvailable -and [Console]::ReadKey($true).Key -eq 'Enter') { break }
            } catch { }
            Start-Sleep -Seconds 3
        }
    } finally {
        # Unlock keys only exist during an enrollment: always remove it, even on Ctrl+C.
        $rm = Invoke-Gate (Format-Script $removeUnlockTemplate @{ DIR = $mapDir; HOST = $gateHost; KEY = $key })
        $key = $null
        $url = $null
        if ($rm.Output -notmatch 'GATE_UNLOCK_REMOVED') {
            Write-Warning "Could not confirm the unlock key was removed. Run '.\gate.ps1 list' and check for pending unlocks. Output:`n$($rm.Output)"
        }
    }
    Update-State 'add'
    if ($enrolled) {
        Write-Host "Enrolled '$Device' on $gateHost. The one-time link has been disabled."
    } else {
        $suffix = ''
        if ($Target -eq 'local') { $suffix = ' -Target local' }
        Write-Warning "Did not see the link being used. The link is now disabled. If the browser didn't get the cookie, run: .\gate.ps1 rotate -Device $Device$suffix"
    }
}

function Invoke-Revoke([switch]$AllowMissing) {
    Assert-Device -AllowForce
    $r = Invoke-Gate (Format-Script $revokeTemplate @{
            PREFLIGHT = $preflight; AWK_HAS_DEVICE = $awkHasDevice; DIR = $mapDir; HOST = $gateHost; DEVICE = $Device
        })
    if ($r.Output -match 'GATE_NOT_INSTALLED') { throw 'The gate config is not installed in nginx on this target. Nothing was changed.' }
    if ($r.Output -match 'GATE_NOT_FOUND') {
        if ($AllowMissing) { return }
        throw "Device '$Device' is not enrolled on $gateHost (names are case-sensitive; see '.\gate.ps1 list')."
    }
    if ($r.Output -notmatch 'GATE_REVOKED') { throw "Revoke failed (map restored). Output:`n$($r.Output)" }
    Update-State 'remove'
    Write-Host "Revoked '$Device' on $gateHost. Its browser now gets 404."
}

function Invoke-List {
    $r = Invoke-Gate (Format-Script $listTemplate @{ DIR = $mapDir; HOST = $gateHost })
    $rows = @()
    foreach ($line in ($r.Output -split "`n")) {
        if ($line -match '^GATE_LINE (\d+) (\S+) (\S+) (\S+)') {
            $rows += [pscustomobject]@{ Line = [int]$Matches[1]; Device = $Matches[2]; Enrolled = $Matches[3]; Status = $Matches[4] }
        }
    }
    Write-Host "Devices enrolled on $gateHost ($Target):"
    if ($rows.Count -eq 0) { Write-Host '  (none)' } else { $rows | Format-Table -AutoSize | Out-String | Write-Host }
    $bad = @($rows | Where-Object { $_.Status -ne 'OK' })
    if ($bad.Count -gt 0) {
        Write-Warning "$($bad.Count) entr$(if ($bad.Count -eq 1) { 'y is' } else { 'ies are' }) not valid (see Status). An INVALID_NAME device passes nginx but gets 404 from the API. Remove with: .\gate.ps1 revoke -Device <name> -Force"
    }
    if ($r.Output -match 'GATE_NGINX_INVALID') {
        Write-Warning "nginx currently REJECTS this map (nginx -t fails), so no enroll/revoke can be reloaded until the broken line is removed. Remove MALFORMED entries with: .\gate.ps1 revoke -Device <name> -Force"
    }
    if ($r.Output -match 'GATE_PENDING (\d+)') {
        Write-Warning "$($Matches[1]) unlock key(s) are still live. An enrollment was interrupted; run 'rotate' for that device to clean up."
    }
}

switch ($Command) {
    'up' { Invoke-Up }
    'down' { Invoke-Down }
    'enroll' { Invoke-Enroll }
    'revoke' { Invoke-Revoke }
    'list' { Invoke-List }
    'rotate' {
        Assert-Device
        Invoke-Revoke -AllowMissing
        Invoke-Enroll
    }
}
