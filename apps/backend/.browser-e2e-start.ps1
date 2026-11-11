$line = Get-Content ..\..\.env | Where-Object { $_.StartsWith('DATABASE_URL=') } | Select-Object -First 1
if (-not $line) { throw 'DATABASE_URL missing' }
$builder = [System.UriBuilder]::new($line.Substring(13).Trim([char]34))
if ($builder.Host -ne 'localhost' -or $builder.Port -ne 5433) { throw 'Unexpected database host' }
$builder.Path = 'dr250_release_browser_clean'
$env:DATABASE_URL = $builder.Uri.AbsoluteUri
$env:DATABASE_SSL = 'false'
$env:PORT = '4310'
$env:CORS_ORIGIN = 'http://127.0.0.1:5179'
npm start
