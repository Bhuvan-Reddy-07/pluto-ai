param (
    [string]$RepoUrl = ""
)

Write-Host "🚀 Pluto AI — GitHub Deployment Pipeline" -ForegroundColor Cyan

if (-not $RepoUrl) {
    $existingRemote = git remote get-url origin 2>$null
    if ($existingRemote) {
        $RepoUrl = $existingRemote
        Write-Host "Found existing origin remote: $RepoUrl" -ForegroundColor Green
    } else {
        $username = (git config user.name)
        if (-not $username) { $username = "your-username" }
        Write-Host "No remote repository specified." -ForegroundColor Yellow
        Write-Host "Usage: .\scripts\deploy-to-github.ps1 https://github.com/$username/pluto-ai.git" -ForegroundColor Yellow
        $RepoUrl = Read-Host "Enter your GitHub repository URL (e.g. https://github.com/$username/pluto-ai.git)"
    }
}

if ($RepoUrl) {
    Write-Host "Linking remote origin: $RepoUrl ..." -ForegroundColor Cyan
    git remote remove origin 2>$null
    git remote add origin $RepoUrl
    
    Write-Host "Pushing main branch to GitHub..." -ForegroundColor Cyan
    git push -u origin main --force
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Successfully pushed to GitHub!" -ForegroundColor Green
        Write-Host "🌐 GitHub Pages will automatically build and deploy your website via GitHub Actions in ~1 minute." -ForegroundColor Green
        Write-Host "   Go to: Repo Settings -> Pages -> Source -> 'GitHub Actions'" -ForegroundColor Cyan
    } else {
        Write-Host "⚠️ Push failed. Please verify repository permissions or personal access token." -ForegroundColor Red
    }
}
