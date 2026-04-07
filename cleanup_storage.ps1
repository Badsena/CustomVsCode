# Clean up ALL possible Amypo Coder storage locations
# product.json dataFolderName = ".amypo-coder"

$paths = @(
    "$env:APPDATA\AmypoCoder-Dev\User\workspaceStorage",
    "$env:APPDATA\AmypoCoder-Dev\storage.json",
    "$env:APPDATA\.amypo-coder\User\workspaceStorage",
    "$env:APPDATA\.amypo-coder\storage.json",
    "$env:APPDATA\Code - OSS Dev\User\workspaceStorage",
    "$env:APPDATA\Code - OSS Dev\storage.json"
)

foreach ($p in $paths) {
    if (Test-Path $p) {
        Remove-Item -Path $p -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Deleted: $p"
    }
}

# Also delete untitled workspaces that cause the restore
$untitledPaths = @(
    "$env:APPDATA\AmypoCoder-Dev\Workspaces",
    "$env:APPDATA\.amypo-coder\Workspaces",
    "$env:APPDATA\Code - OSS Dev\Workspaces"
)

foreach ($p in $untitledPaths) {
    if (Test-Path $p) {
        Remove-Item -Path $p -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Deleted workspaces: $p"
    }
}

Write-Host "Cleanup completed."
