# HeirWise 로컬 동기화 — sync-local.ps1 (보안등급: 공유 가능)
# 매주 C:\dev\HeirWise-deploy 를 GitHub(=finitart.com)과 맞춘다. 로컬 작업을 지우지 않는 안전한 방식:
#  - 항상 fetch(받기)만 먼저 하고,
#  - main 브랜치에 있고 수정 중인 파일이 없을 때만 fast-forward 로 합친다.
#  - 다른 브랜치(예: design-upgrade)에서 작업 중이면 받기만 하고 건드리지 않는다.
$repo = "C:\dev\HeirWise-deploy"
$log  = Join-Path $repo "_automation\sync-local.log"
$now  = Get-Date -Format "yyyy-MM-dd HH:mm"
git -C $repo fetch origin 2>&1 | Out-Null
$branch = (git -C $repo rev-parse --abbrev-ref HEAD).Trim()
$dirty  = git -C $repo status --porcelain
if ($branch -ne "main") {
  $msg = "$now 받기만 함 — 현재 브랜치 $branch (main 아님)"
} elseif ($dirty) {
  $msg = "$now 받기만 함 — 커밋 안 된 수정 파일 있음"
} else {
  $out = git -C $repo merge --ff-only origin/main 2>&1
  $msg = "$now main 갱신: " + ($out | Select-Object -Last 1)
}
Add-Content -Path $log -Value $msg -Encoding UTF8
Write-Output $msg
