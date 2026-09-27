<#
.SYNOPSIS
    Tests gate.ps1 argument handling and map operations against a throwaway nginx:1.24
    container (never the real local gate, never the server). Plain script, no Pester
    dependency, so it runs the same in Windows PowerShell 5.1 and pwsh (CI).

    Usage: powershell -File deploy/device-gate/test/test-gate.ps1   (or pwsh -File ...)
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$here = $PSScriptRoot
$gate = Join-Path (Join-Path $here '..') 'gate.ps1'
$nginxDir = Join-Path (Join-Path (Join-Path (Join-Path $here '..') '..') 'nginx') 'conf.d'
$container = 'pf-gate-pstest'
$stateDir = Join-Path ([IO.Path]::GetTempPath()) ("pf-gate-pstest-" + [guid]::NewGuid().ToString('N'))
$shell = (Get-Process -Id $PID).Path
$script:pass = 0
$script:fail = 0

function Invoke-GateCli([string[]]$GateArgs) {
    $all = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $gate) + $GateArgs +
        @('-Target', 'local', '-LocalContainer', $container, '-StateDir', $stateDir)
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $out = & $shell @all 2>&1 | ForEach-Object { "$_" }
        $code = $LASTEXITCODE
    } finally { $ErrorActionPreference = $prev }
    $text = $out -join "`n"
    # pwsh 7 on Linux renders a child's error with ANSI colours and wraps it at the console
    # width behind '     | ' gutters. Flat = no escapes, no gutters, no whitespace, for substring checks.
    $flat = ($text -replace '\x1b\[[0-9;?]*[A-Za-z]', '' -replace '(?m)^\s*\|', '' -replace '\s+', '')
    return [pscustomobject]@{ Code = $code; Output = $text; Flat = $flat }
}

function Invoke-InContainer([string]$Cmd) {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { $o = & docker exec $container sh -c $Cmd 2>&1 | ForEach-Object { "$_" } } finally { $ErrorActionPreference = $prev }
    return ($o -join "`n")
}

function Test-Case([string]$Name, [bool]$Condition, [string]$Detail = '') {
    if ($Condition) { $script:pass++; Write-Host "  ok   $Name" }
    else { $script:fail++; Write-Host "  FAIL $Name"; if ($Detail) { Write-Host "       $Detail" } }
}

function New-Token {
    $b = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
    return [Convert]::ToBase64String($b).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

Write-Host '> starting throwaway nginx:1.24 with the real conf.d/device-gate.conf'
$prev = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
& docker rm -f $container 2>&1 | Out-Null
$confPath = (Resolve-Path (Join-Path $nginxDir 'device-gate.conf')).Path
& docker run -d --name $container -v "$($confPath):/etc/nginx/conf.d/00-device-gate.conf:ro" nginx:1.24 2>&1 | Out-Null
$ErrorActionPreference = $prev
Start-Sleep -Seconds 2

try {
    Write-Host '> device name validation (case-sensitive)'
    $r = Invoke-GateCli @('enroll', '-Device', 'LAPTOP', '-PrintUrl', '-TimeoutSec', '5')
    Test-Case 'enroll -Device LAPTOP is rejected' ($r.Code -ne 0) $r.Output
    Test-Case '...with a lowercase explanation' ($r.Flat -match 'lowercase' -and $r.Flat.Contains("Didyoumean'laptop'")) $r.Output
    Test-Case '...and nothing was written' ((Invoke-InContainer 'cat /etc/nginx/device-gate/localhost.map 2>/dev/null | wc -l').Trim() -in @('0', ''))

    foreach ($bad in @('Pc', 'a b', 'x;rm', '-pc', 'with.dot', ('a' * 33))) {
        $r = Invoke-GateCli @('enroll', '-Device', $bad, '-PrintUrl', '-TimeoutSec', '5')
        Test-Case "enroll -Device '$bad' is rejected" ($r.Code -ne 0) $r.Output
    }
    $r = Invoke-GateCli @('rotate', '-Device', 'LAPTOP', '-PrintUrl', '-TimeoutSec', '5')
    Test-Case 'rotate -Device LAPTOP is rejected (rotate re-enrolls, so it needs a valid name)' ($r.Code -ne 0) $r.Output

    Write-Host '> valid enrollment'
    $r = Invoke-GateCli @('enroll', '-Device', 'ok-dev', '-PrintUrl', '-TimeoutSec', '5')
    Test-Case 'enroll -Device ok-dev succeeds' ($r.Code -eq 0) $r.Output
    Test-Case 'the unlock key is removed afterwards' ((Invoke-InContainer 'grep -c . /etc/nginx/device-gate/localhost.unlock || true').Trim() -eq '0')

    Write-Host '> list shows every line, malformed ones flagged, never tokens'
    $t1 = New-Token; $t2 = New-Token; $t3 = New-Token
    $inject = @(
        "`"localhost:$t1`" LAPTOP; # enrolled 2026-09-27T00:00:00Z",
        "`"localhost:short`" shorttok; # enrolled 2026-09-27T00:00:00Z",
        "`"otherhost:$t2`" elsewhere; # enrolled 2026-09-27T00:00:00Z",
        "`"localhost:$t3`" nosemi # enrolled 2026-09-27T00:00:00Z"
    ) -join "`n"
    $prev = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
    $inject | & docker exec -i $container sh -c 'cat >> /etc/nginx/device-gate/localhost.map' 2>&1 | Out-Null
    $ErrorActionPreference = $prev
    $r = Invoke-GateCli @('list')
    Test-Case 'list succeeds' ($r.Code -eq 0) $r.Output
    Test-Case 'valid device is OK' ($r.Output -match 'ok-dev\s+\S+\s+OK') $r.Output
    Test-Case 'uppercase device shows as INVALID_NAME' ($r.Output -match 'LAPTOP\s+\S+\s+INVALID_NAME') $r.Output
    Test-Case 'short token shows as MALFORMED:token' ($r.Output -match 'MALFORMED:token') $r.Output
    Test-Case 'foreign host shows as MALFORMED:host-or-quotes' ($r.Output -match 'MALFORMED:host-or-quotes') $r.Output
    Test-Case 'missing semicolon shows as MALFORMED:syntax' ($r.Output -match 'MALFORMED:syntax') $r.Output
    Test-Case 'a warning points to revoke -Force' ($r.Output -match 'revoke -Device <name> -Force') $r.Output
    Test-Case 'list warns that nginx rejects the current map' ($r.Output -match 'REJECTS this map') $r.Output
    Test-Case 'no token appears in the output' (-not ($r.Output.Contains($t1) -or $r.Output.Contains($t2) -or $r.Output.Contains($t3))) 'token leaked'

    Write-Host '> repairing a map that nginx rejects'
    $r = Invoke-GateCli @('revoke', '-Device', 'nosemi', '-Force')
    Test-Case 'revoke -Device nosemi -Force removes the line that broke nginx' ($r.Code -eq 0 -and $r.Output -match 'Revoked') $r.Output
    $r = Invoke-GateCli @('list')
    Test-Case '...and nginx accepts the map again' (-not ($r.Output -match 'REJECTS this map')) $r.Output

    Write-Host '> revoke of a non-conforming name'
    $r = Invoke-GateCli @('revoke', '-Device', 'LAPTOP')
    Test-Case 'revoke -Device LAPTOP without -Force is rejected' ($r.Code -ne 0 -and $r.Output -match '-Force') $r.Output
    $r = Invoke-GateCli @('revoke', '-Device', 'x;rm', '-Force')
    Test-Case "revoke -Device 'x;rm' -Force is rejected (unsafe characters)" ($r.Code -ne 0) $r.Output
    $r = Invoke-GateCli @('revoke', '-Device', 'LAPTOP', '-Force')
    Test-Case 'revoke -Device LAPTOP -Force removes it' ($r.Code -eq 0 -and $r.Output -match 'Revoked') $r.Output
    $r = Invoke-GateCli @('list')
    Test-Case '...and it is gone from list' (-not ($r.Output -match 'LAPTOP')) $r.Output
    Test-Case '...other entries are untouched' ($r.Output -match 'ok-dev') $r.Output
    $r = Invoke-GateCli @('revoke', '-Device', 'laptop')
    Test-Case 'revoke is case-sensitive (laptop != LAPTOP) and says so' ($r.Code -ne 0 -and $r.Output -match 'case-sensitive') $r.Output

    Write-Host '> revoke of a valid device'
    $r = Invoke-GateCli @('revoke', '-Device', 'ok-dev')
    Test-Case 'revoke -Device ok-dev' ($r.Code -eq 0) $r.Output
    Test-Case 'nginx config still valid after all edits' ((Invoke-InContainer 'nginx -t 2>&1') -match 'successful')
} finally {
    $prev = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
    & docker rm -f $container 2>&1 | Out-Null
    $ErrorActionPreference = $prev
    Remove-Item -Recurse -Force $stateDir -ErrorAction SilentlyContinue
}

Write-Host ''
Write-Host "$($script:pass) passed, $($script:fail) failed"
if ($script:fail -gt 0) { exit 1 }
