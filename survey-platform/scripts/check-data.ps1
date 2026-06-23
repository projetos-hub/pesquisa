$key = $env:SUPABASE_SERVICE_ROLE_KEY
$url = "https://qnpvlhfjknnvfiyxrhhl.supabase.co/rest/v1"
$surveyId = "059ac508-4848-49e7-be82-8d1bd6ca3c08"

if (-not $key) {
    throw "SUPABASE_SERVICE_ROLE_KEY precisa estar definido no ambiente para executar este script."
}

Write-Output "=== All responses for amostral1 ==="
$sessions = curl.exe -s -H "apikey: $key" -H "Authorization: Bearer $key" "$url/response_sessions?select=id,community_id,user_id,submitted_at&survey_id=eq.$surveyId&order=submitted_at.desc&limit=50"
$sessionsArr = $sessions | ConvertFrom-Json

$total = $sessionsArr.Count
Write-Output "Total sessions: $total"

$nulls = 0
$zeros = 0
$withValues = 0

foreach ($s in $sessionsArr) {
    $sid = $s.id
    $resp = curl.exe -s -H "apikey: $key" -H "Authorization: Bearer $key" "$url/responses?select=question_key,value&session_id=eq.$sid"
    $respData = $resp | ConvertFrom-Json
    $scale = $respData | Where-Object { $_."question_key" -eq "avalie_considerando_6_como_muito_satisfe" }

    if (-not $scale) {
        Write-Output "Session $sid : NO SCALE DATA"
        $nulls++
    } elseif (-not $scale."value" -or ($scale."value" -eq "{}")) {
        Write-Output "Session $sid : EMPTY SCALE"
        $nulls++
    } else {
        $v = $scale."value"
        $vStr = $v | ConvertTo-Json -Compress
        Write-Output "Session $sid : community=$($s.community_id) scale=$vStr"
        $withValues++
    }
}

Write-Output "`n=== Summary ==="
Write-Output "Total: $total"
Write-Output "With values: $withValues"
Write-Output "Missing/empty: $nulls"
