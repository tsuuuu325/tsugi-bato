# Generate vocal samples — tries System.Speech, then Edge TTS API
$ErrorActionPreference = 'Stop'
$outDir = Join-Path $PSScriptRoot '..\public\audio\vocals'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$vocals = [ordered]@{
  drift = 'I drift in the dark tonight. Smoke in the air.'
  smoke = 'Smoke in the air. I cannot see. Lost in the night.'
  yeah  = 'Yeah. Yeah yeah. Ride that beat all night.'
  dark  = 'Born in the dark. We ride. We never stop.'
  ride  = 'Ride ride ride. Do not stop. Feel the bass drop.'
}

function New-SapiVocals {
  $dll = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\System.Speech.dll'
  if (-not (Test-Path $dll)) { return $false }
  Add-Type -Path $dll
  $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $synth.Rate = -3
  $synth.Volume = 100
  $voices = $synth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo }
  $male = $voices | Where-Object { $_.Gender -eq 'Male' } | Select-Object -First 1
  if ($male) { $synth.SelectVoice($male.Name) }
  foreach ($entry in $vocals.GetEnumerator()) {
    $path = Join-Path $outDir "$($entry.Key).wav"
    if (Test-Path $path) { Remove-Item $path -Force }
    $synth.SetOutputToWaveFile($path)
    $synth.Speak($entry.Value)
    $synth.SetOutputToNull()
    Write-Host "SAPI: $path"
  }
  return $true
}

function New-EdgeVocals {
  $tokenUrl = 'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/token/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4'
  $token = (Invoke-RestMethod -Uri $tokenUrl -Headers @{ 'User-Agent' = 'Mozilla/5.0' }).Trim()
  $voice = 'en-US-ChristopherNeural'
  $ttsUrl = 'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4'
  foreach ($entry in $vocals.GetEnumerator()) {
    $ssml = "<speak version='1.0' xml:lang='en-US'><voice name='$voice'><prosody rate='-20%'>$($entry.Value)</prosody></voice></speak>"
    $path = Join-Path $outDir "$($entry.Key).mp3"
    $bytes = Invoke-RestMethod -Uri $ttsUrl -Method Post -Body $ssml -ContentType 'application/ssml+xml' `
      -Headers @{
        'User-Agent' = 'Mozilla/5.0'
        Authorization = $token
        'X-Microsoft-OutputFormat' = 'audio-24khz-48kbitrate-mono-mp3'
      } -OutFile $path
    Write-Host "Edge: $path"
  }
  return $true
}

if (New-SapiVocals) {
  Write-Host 'Done (SAPI WAV).'
} elseif (New-EdgeVocals) {
  Write-Host 'Done (Edge MP3).'
} else {
  throw 'Could not generate vocals.'
}
