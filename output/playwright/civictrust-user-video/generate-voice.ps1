$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech

$outputDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$scenePath = Join-Path $outputDir 'scenes.json'
$scenes = Get-Content -LiteralPath $scenePath -Raw -Encoding utf8 | ConvertFrom-Json
$synth = [System.Speech.Synthesis.SpeechSynthesizer]::new()
$synth.SelectVoice('Microsoft Helena Desktop')
$synth.Rate = 0
$synth.Volume = 100

foreach ($scene in $scenes) {
  $wavPath = Join-Path $outputDir "voz-$($scene.Number).wav"
  $synth.SetOutputToWaveFile($wavPath)
  $synth.Speak($scene.Text)
  $synth.SetOutputToNull()
  Write-Output "Generada voz-$($scene.Number).wav"
}
$synth.Dispose()
