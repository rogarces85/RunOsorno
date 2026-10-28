# Iniciar el servidor Next.js en segundo plano
$nodeProcess = Start-Process -FilePath "npx" -ArgumentList "next dev" -WorkingDirectory "C:\xampp\htdocs\www\RunOsorno" -RedirectStandardOutput "dev-output-full.log" -RedirectStandardError "dev-error-full.log" -PassThru

Write-Host "Proceso de Node iniciado con PID: $($nodeProcess.Id)"
Write-Host "Esperando 15 segundos para que el servidor inicie..."
Start-Sleep -Seconds 15

# Verificar si el proceso sigue vivo
if ($nodeProcess.HasExited) {
    Write-Host "ERROR: El proceso de Node se ha detenido. Código de salida: $($nodeProcess.ExitCode)"
    Write-Host "--- Últimas líneas del error log ---"
    Get-Content dev-error-full.log -Tail 20
    exit 1
}

# Probar conectividad
$urls = @("http://localhost:3000/", "http://127.0.0.1:3000/")
foreach ($url in $urls) {
    Write-Host "Probando: $url"
    try {
        $r = Invoke-WebRequest -Uri $url -TimeoutSec 10 -ErrorAction Stop
        Write-Host "  EXITO: $($r.StatusCode) - $($r.StatusDescription)"
        Write-Host "  Tamaño: $($r.ContentLength) bytes"
        break
    } catch {
        Write-Host "  Error: $($_.Exception.Message)"
    }
}

# Verificar si el proceso sigue vivo
if ($nodeProcess.HasExited) {
    Write-Host "ADVERTENCIA: El proceso de Node se ha detenido después de la prueba."
    Write-Host "Código de salida: $($nodeProcess.ExitCode)"
    Write-Host "--- Últimas líneas del error log ---"
    Get-Content dev-error-full.log -Tail 20
} else {
    Write-Host "El servidor sigue corriendo (PID: $($nodeProcess.Id))"
}