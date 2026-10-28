# Iniciar el servidor Next.js usando cmd /c
$nodeProcess = Start-Process -FilePath "cmd" -ArgumentList "/c", "npm run dev" -WorkingDirectory "C:\xampp\htdocs\www\RunOsorno" -RedirectStandardOutput "dev-output-final.log" -RedirectStandardError "dev-error-final.log" -PassThru

Write-Host "Proceso de Node iniciado con PID: $($nodeProcess.Id)"
Write-Host "Esperando 15 segundos para que el servidor inicie..."
Start-Sleep -Seconds 15

# Verificar si el proceso sigue vivo
if ($nodeProcess.HasExited) {
    Write-Host "ERROR: El proceso de Node se ha detenido. Código de salida: $($nodeProcess.ExitCode)"
    Write-Host "--- Últimas líneas del error log ---"
    Get-Content dev-error-final.log -Tail 30
    exit 1
}

Write-Host "El servidor sigue corriendo (PID: $($nodeProcess.Id))"
Write-Host ""
Write-Host "=== Probando conectividad HTTP ==="

# Probar conectividad
$urls = @("http://localhost:3000/", "http://127.0.0.1:3000/")
foreach ($url in $urls) {
    Write-Host "Probando: $url"
    try {
        $r = Invoke-WebRequest -Uri $url -TimeoutSec 10 -ErrorAction Stop
        Write-Host "  EXITO: $($r.StatusCode) - $($r.StatusDescription)"
        Write-Host "  Tamaño: $($r.ContentLength) bytes"
        $content = $r.Content
        if ($content.Length -gt 200) {
            $content = $content.Substring(0, 200)
        }
        Write-Host "  Contenido: $content"
        break
    } catch {
        Write-Host "  Error: $($_.Exception.Message)"
    }
    Write-Host ""
}

# Mantener el servidor corriendo para que el usuario pueda probar
Write-Host ""
Write-Host "El servidor sigue corriendo en segundo plano (PID: $($nodeProcess.Id))"
Write-Host "Puedes acceder a http://localhost:3000/ desde tu navegador"