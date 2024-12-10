
        # Self-elevation check and re-launch as Administrator if needed
        if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
            Write-Host "Attempting to run script as Administrator..."
            $scriptPath = $MyInvocation.MyCommand.Path
            Start-Process -FilePath "powershell.exe" -ArgumentList "-ExecutionPolicy Bypass -File `"$scriptPath`"" -Verb RunAs
            exit
        }

        # Stop any service running on port 53
        $port = 53
        $netstatOutput = netstat -aon | Select-String ":$port"

        if ($netstatOutput) {
            $pids = $netstatOutput | ForEach-Object {
                if ($_ -match '.*LISTENING\s+(\d+)$') {
                    $matches[1]
                }
            }
            $pids | ForEach-Object {
                try {
                    Stop-Process -Id $_ -Force -ErrorAction Stop
                    Write-Host "Process with PID: $_ stopped successfully."
                } catch {
                    Write-Host "Failed to stop process with PID: $_."
                }
            }
        } else {
            Write-Host "No processes found running on port $port."
        }

        # Set DNS to localhost
        $interfaceName = Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | Select-Object -First 1 -ExpandProperty Name
        if ($interfaceName) {
            Write-Host "Setting DNS to 127.0.0.1 on interface $interfaceName"
            Set-DnsClientServerAddress -InterfaceAlias $interfaceName -ServerAddresses 127.0.0.1
        } else {
            Write-Host "No active network interfaces found."
        }
        