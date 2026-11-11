$line = Get-Content ..\..\.env | Where-Object { $_.StartsWith('DATABASE_URL=') } | Select-Object -First 1
if (-not $line) { throw 'DATABASE_URL missing' }
$builder = [System.UriBuilder]::new($line.Substring(13).Trim([char]34))
if ($builder.Host -ne 'localhost' -or $builder.Port -ne 5433) { throw 'Unexpected database host' }
$builder.Path = 'dr250_release_browser_clean'
$env:DATABASE_URL = $builder.Uri.AbsoluteUri
$env:DR250_DISPOSABLE_URL = $env:DATABASE_URL
$env:DATABASE_SSL = 'false'
if (-not $env:DR250_DEMO_ADMIN_PASSWORD) { throw 'Set DR250_DEMO_ADMIN_PASSWORD privately before provisioning.' }
node scripts/provision-demo-admin.js e2e.admin.browser@example.invalid 'E2E Admin'
