$urls = @("http://localhost:3000/", "http://127.0.0.1:3000/", "http://[::1]:3000/")
foreach ($url in $urls) {
    Write-Host "Probando: $url"
    try {
        $r = Invoke-WebRequest -Uri $url -TimeoutSec 10 -ErrorAction Stop
        Write-Host "  Estado: $($r.StatusCode) - $($r.StatusDescription)"
        Write-Host "  Tamaño: $($r.ContentLength) bytes"
        Write-Host "  Tipo: $($r.Headers['Content-Type'])"
        Write-Host "  Primeros 200 chars: $($r.Content.Substring(0, [Math]::Min(200, $r.Content.Length)))"
        break
    } catch {
        Write-Host "  Error: $($_.Exception.Message)"
    }
    Write-Host ""
}