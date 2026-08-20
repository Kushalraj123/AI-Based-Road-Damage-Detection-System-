# Read stdin (hook contract payload, not strictly needed but clears buffer)
$inputData = [Console]::In.ReadToEnd()

# Check for modified files in git
$status = git status --porcelain
if ($status) {
    # Stage all changes
    git add -A
    
    # Commit changes
    git commit -m "Auto-commit: Antigravity workspace sync"
    
    # Get current branch
    $branch = (git branch --show-current).Trim()
    if (-not $branch) {
        $branch = "main"
    }
    
    # Push to origin
    git push origin $branch
}

# Output empty JSON to stdout as required by hook contract
Write-Output "{}"
