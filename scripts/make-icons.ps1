Add-Type -AssemblyName System.Drawing

function New-TravelIcon([int]$size, [string]$out) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::FromArgb(255, 26, 53, 80))
  $u = $size / 512.0

  $bgRect = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point(0, 0)),
    (New-Object System.Drawing.Point($size, $size)),
    [System.Drawing.Color]::FromArgb(255, 42, 156, 134),
    [System.Drawing.Color]::FromArgb(255, 92, 74, 214))
  $g.FillRectangle($bgRect, 0, 0, $size, $size)

  $star = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 215, 106))
  $starPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 255, 244, 200), (6 * $u))
  $starPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $cx = 256 * $u
  $cy = 210 * $u
  $rOuter = 130 * $u
  $rInner = 52 * $u
  for ($i = 0; $i -lt 10; $i++) {
    $a = [Math]::PI / 2 + $i * [Math]::PI / 5
    $r = if ($i % 2 -eq 0) { $rOuter } else { $rInner }
    $px = $cx + [Math]::Cos($a) * $r
    $py = $cy - [Math]::Sin($a) * $r
    if ($i -eq 0) { $starPath.StartFigure() }
    $starPath.AddLine($px, $py, $px, $py)
  }
  $starPath.CloseFigure()
  $g.FillPath($star, $starPath)

  $road = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 233, 241, 245))
  $roadPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(180, 20, 45, 60), (10 * $u))
  $roadPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $roadPath.AddBezier((96 * $u), (430 * $u), (140 * $u), (330 * $u), (330 * $u), (340 * $u), (330 * $u), (420 * $u))
  $roadPath.AddBezier((330 * $u), (420 * $u), (340 * $u), (420 * $u), (140 * $u), (430 * $u), (96 * $u), (430 * $u))
  $g.FillPath($road, $roadPath)
  $g.DrawPath($roadPen, $roadPath)

  $dotPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(200, 255, 255, 255), (8 * $u))
  $dotPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $dotPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $g.DrawLine($dotPen, (120 * $u), (392 * $u), (120 * $u), (392 * $u))
  $g.DrawLine($dotPen, (180 * $u), (368 * $u), (180 * $u), (368 * $u))
  $g.DrawLine($dotPen, (250 * $u), (368 * $u), (250 * $u), (368 * $u))

  $g.Dispose()
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output "saved $out"
}

New-TravelIcon 192 "D:\yinyun\Your Journey Awaits\icons\icon-192.png"
New-TravelIcon 512 "D:\yinyun\Your Journey Awaits\icons\icon-512.png"
New-TravelIcon 180 "D:\yinyun\Your Journey Awaits\icons\apple-touch-icon.png"
