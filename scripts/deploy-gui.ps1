Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$form = New-Object System.Windows.Forms.Form
$form.Text = "CEE Mods Tracker Deployment"
$form.Size = New-Object System.Drawing.Size(560, 460)
$form.StartPosition = "CenterScreen"

function New-Label($text, $x, $y) {
  $label = New-Object System.Windows.Forms.Label
  $label.Text = $text
  $label.Location = New-Object System.Drawing.Point($x, $y)
  $label.Size = New-Object System.Drawing.Size(190, 24)
  return $label
}

function New-Input($x, $y, $w, $default) {
  $input = New-Object System.Windows.Forms.TextBox
  $input.Location = New-Object System.Drawing.Point($x, $y)
  $input.Size = New-Object System.Drawing.Size($w, 24)
  $input.Text = $default
  return $input
}

$workspace = (Resolve-Path "$PSScriptRoot\..").Path

$form.Controls.Add((New-Label "VPS/Server Host/IP" 20 20))
$hostInput = New-Input 210 20 310 "your.vps.ip"
$form.Controls.Add($hostInput)

$form.Controls.Add((New-Label "SSH User" 20 60))
$userInput = New-Input 210 60 310 "user"
$form.Controls.Add($userInput)

$form.Controls.Add((New-Label "SSH Port" 20 100))
$portInput = New-Input 210 100 310 "22"
$form.Controls.Add($portInput)

$form.Controls.Add((New-Label "SSH Private Key (optional)" 20 140))
$keyInput = New-Input 210 140 310 ""
$form.Controls.Add($keyInput)

$form.Controls.Add((New-Label "Remote Path" 20 180))
$pathInput = New-Input 210 180 310 "/your_remote_repo_path/"
$form.Controls.Add($pathInput)

$log = New-Object System.Windows.Forms.TextBox
$log.Location = New-Object System.Drawing.Point(20, 260)
$log.Size = New-Object System.Drawing.Size(500, 150)
$log.Multiline = $true
$log.ScrollBars = "Vertical"
$log.ReadOnly = $true
$form.Controls.Add($log)

function Append-Log($line) {
  $log.AppendText("$line`r`n")
}

$deployButton = New-Object System.Windows.Forms.Button
$deployButton.Text = "Deploy / Update"
$deployButton.Location = New-Object System.Drawing.Point(20, 220)
$deployButton.Size = New-Object System.Drawing.Size(180, 30)

$deployButton.Add_Click({
  try {
    $vpsHost = $hostInput.Text.Trim()
    $sshUser = $userInput.Text.Trim()
    $sshPort = $portInput.Text.Trim()
    $remotePath = $pathInput.Text.Trim()
    $key = $keyInput.Text.Trim()

    if (-not $vpsHost -or -not $sshUser -or -not $remotePath) {
      [System.Windows.Forms.MessageBox]::Show("Host, user, and remote path are required.")
      return
    }

    $sshTarget = "$sshUser@$vpsHost"
    $keyPart = ""
    if ($key) { $keyPart = "-i `"$key`"" }
    $sshBase = "ssh $keyPart -p $sshPort"
    $scpBase = "scp $keyPart -P $sshPort"

    Append-Log "Building project..."
    Push-Location $workspace
    try {
      npm install | Out-Null
      npm run build | Out-Null

      Append-Log "Uploading project files..."
      Invoke-Expression "$sshBase $sshTarget `"mkdir -p $remotePath`""

      # Try to find rsync if not in PATH
      $rsyncPath = "rsync"
      if (-not (Get-Command "rsync" -ErrorAction SilentlyContinue)) {
        $commonPaths = @(
          "C:\Program Files\Git\usr\bin\rsync.exe",
          "C:\Program Files (x86)\Git\usr\bin\rsync.exe",
          "$env:ProgramData\chocolatey\bin\rsync.exe"
        )
        foreach ($p in $commonPaths) {
          if (Test-Path $p) { $rsyncPath = $p; break }
        }
      }

      if (Get-Command $rsyncPath -ErrorAction SilentlyContinue) {
        Append-Log "Using rsync delta upload (changed files only)..."
        $rsyncSsh = "ssh -p $sshPort"
        if ($key) { $rsyncSsh = "$rsyncSsh -i `"$key`"" }
        $rsyncCommand = @(
          "& `"$rsyncPath`" -az --delete",
          "--exclude node_modules",
          "--exclude .git",
          "--exclude .cursor",
          "--exclude agent-transcripts",
          "--exclude terminals",
          "--exclude *.log",
          "--exclude .env",
          "-e `"$rsyncSsh`"",
          "./",
          "$sshTarget`:$remotePath/"
        ) -join " "
        Invoke-Expression $rsyncCommand
      } else {
        Append-Log "rsync not found. Falling back to tar-based upload (faster than scp)..."
        Append-Log "TIP: Install rsync (e.g. 'choco install rsync') for even faster 'changed files only' updates."
        
        # Use tar to archive and pipe to ssh (Windows 10+ has tar.exe)
        $tarCmd = "tar --exclude=node_modules --exclude=.git --exclude=.cursor --exclude=agent-transcripts --exclude=terminals -czf - . | $sshBase $sshTarget `"tar -xzf - -C $remotePath`""
        Invoke-Expression $tarCmd
      }

      if (Test-Path ".env") {
        Append-Log "Uploading .env..."
        Invoke-Expression "$scpBase `".env`" $sshTarget`:$remotePath/.env"
      } else {
        Append-Log "No local .env found. Skipping .env upload."
      }

      Append-Log "Restarting PM2 and saving..."
      Invoke-Expression "$sshBase $sshTarget `"cd $remotePath && pm2 startOrReload ecosystem.config.cjs --update-env && pm2 save`""

      Append-Log "Deployment complete."
      [System.Windows.Forms.MessageBox]::Show("Deployment completed successfully.")
    } finally {
      Pop-Location
    }
  } catch {
    Append-Log "Deployment failed: $($_.Exception.Message)"
    [System.Windows.Forms.MessageBox]::Show("Deployment failed. Check logs.")
  }
})

$form.Controls.Add($deployButton)
[void]$form.ShowDialog()
