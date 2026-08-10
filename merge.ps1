$source = "c:\Users\Za\Desktop\project\Yekis_jobs\resource_to_read\yekis backend new"
$target = "c:\Users\Za\Desktop\project\Yekis_jobs"

$sourceFiles = Get-ChildItem -Path $source -Recurse -File -Exclude node_modules,.git,dist,build,.next

$excludeCopy = @("README.md", "pnpm-lock.yaml", "infra\postgres\init.sql")

foreach ($file in $sourceFiles) {
    if ($file.FullName -match "\\node_modules\\" -or $file.FullName -match "\\dist\\") { continue }
    
    $relativePath = $file.FullName.Substring($source.Length + 1)
    
    $shouldExclude = $false
    foreach ($ex in $excludeCopy) {
        if ($relativePath -eq $ex) { $shouldExclude = $true; break }
    }
    
    if ($shouldExclude) {
        Write-Host "Skipping: $relativePath"
        continue
    }
    
    $targetFile = Join-Path -Path $target -ChildPath $relativePath
    $targetDir = Split-Path -Path $targetFile -Parent
    
    if (-not (Test-Path -Path $targetDir)) {
        New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
    }
    
    Copy-Item -Path $file.FullName -Destination $targetFile -Force
    Write-Host "Copied: $relativePath"
}
