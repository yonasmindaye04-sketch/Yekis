$source = "c:\Users\Za\Desktop\project\Yekis_jobs\resource_to_read\yekis backend new"
$target = "c:\Users\Za\Desktop\project\Yekis_jobs"

$sourceFiles = Get-ChildItem -Path $source -Recurse -File -Exclude node_modules,.git,dist,build,.next

foreach ($file in $sourceFiles) {
    if ($file.FullName -match "\\node_modules\\" -or $file.FullName -match "\\dist\\") { continue }
    
    $relativePath = $file.FullName.Substring($source.Length + 1)
    $targetFile = Join-Path -Path $target -ChildPath $relativePath
    
    if (-not (Test-Path -Path $targetFile)) {
        Write-Host "NEW: $relativePath"
    } else {
        $sourceHash = (Get-FileHash -Path $file.FullName).Hash
        $targetHash = (Get-FileHash -Path $targetFile).Hash
        if ($sourceHash -ne $targetHash) {
            Write-Host "DIFF: $relativePath"
        }
    }
}
