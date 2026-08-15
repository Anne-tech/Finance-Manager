# Script PowerShell para incrementar versao do build.gradle

param(
    [string]$BuildGradlePath
)

Write-Host "[1/3] Lendo versao atual..." -ForegroundColor Cyan
Write-Host ""

# Ler o arquivo
$content = Get-Content $BuildGradlePath -Raw

# Extrair versionCode atual
if ($content -match 'versionCode (\d+)') {
    $oldVersionCode = [int]$matches[1]
    $newVersionCode = $oldVersionCode + 1
    Write-Host "Version Code: $oldVersionCode -> $newVersionCode" -ForegroundColor Green
} else {
    Write-Host "Erro: nao foi possivel encontrar versionCode" -ForegroundColor Red
    exit 1
}

# Extrair versionName atual
if ($content -match 'versionName "(\d+)\.(\d+)\.(\d+)"') {
    $major = [int]$matches[1]
    $minor = [int]$matches[2]
    $patch = [int]$matches[3]
    $newPatch = $patch + 1
    $oldVersionName = "$major.$minor.$patch"
    $newVersionName = "$major.$minor.$newPatch"
    Write-Host "Version Name: $oldVersionName -> $newVersionName" -ForegroundColor Green
} else {
    Write-Host "Erro: nao foi possivel encontrar versionName" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[2/3] Atualizando arquivo build.gradle..." -ForegroundColor Cyan

# Atualizar versionCode
$content = $content -replace 'versionCode \d+', "versionCode $newVersionCode"

# Atualizar versionName
$content = $content -replace 'versionName "\d+\.\d+\.\d+"', "versionName `"$newVersionName`""

# Salvar arquivo SEM BOM
$Utf8NoBomEncoding = New-Object System.Text.UTF8Encoding $False
[System.IO.File]::WriteAllText($BuildGradlePath, $content, $Utf8NoBomEncoding)

Write-Host "Arquivo atualizado com sucesso!" -ForegroundColor Green
Write-Host ""

exit 0
