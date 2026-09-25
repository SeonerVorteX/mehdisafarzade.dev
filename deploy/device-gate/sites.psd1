@{
    # Gated sites for gate.ps1 (-Site <name>). No secrets here: tokens live only in
    # the server-side map files. -Target local ignores Host/Ssh and uses the local
    # dev gate (https://localhost:8443, container portfolio-gate-dev).
    'portfolio-admin' = @{
        Host      = 'admin.mehdisafarzade.dev'
        Ssh       = 'root@examination'
        RemoteDir = '/etc/nginx/device-gate'
        EnrollLog = '/var/log/nginx/device-gate.log'
    }

    # Later (after Examination's frontend ports are bound to 127.0.0.1 and its admin
    # vhost includes snippets/device-gate.conf):
    # 'examination-admin' = @{
    #     Host      = 'admin.examination.az'
    #     Ssh       = 'root@examination'
    #     RemoteDir = '/etc/nginx/device-gate'
    #     EnrollLog = '/var/log/nginx/device-gate.log'
    # }
}
