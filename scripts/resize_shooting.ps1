Add-Type -AssemblyName System.Drawing

$srcDir = "c:\Users\intern.Jtenefo\Desktop\ISETAG CHATBOT\SHOOTING ISETAG - FBS PICTURES"
$dstDir = "c:\Users\intern.Jtenefo\Desktop\ISETAG CHATBOT\temp_shooting_resized"

if (-not (Test-Path $dstDir)) {
    New-Item -ItemType Directory -Path $dstDir -Force | Out-Null
}

$files = Get-ChildItem -Path $srcDir -Filter "*.jpeg"
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]80)

Write-Host "Resizing $($files.Count) images..."

foreach ($file in $files) {
    $dstPath = Join-Path $dstDir $file.Name
    if (Test-Path $dstPath) {
        Write-Host "Skipping $($file.Name) (already exists)"
        continue
    }

    try {
        $img = [System.Drawing.Image]::FromFile($file.FullName)
        $maxDim = 1600
        $w = $img.Width
        $h = $img.Height

        if ($w -gt $maxDim -or $h -gt $maxDim) {
            if ($w -gt $h) {
                $newW = $maxDim
                $newH = [int]($h * $maxDim / $w)
            } else {
                $newH = $maxDim
                $newW = [int]($w * $maxDim / $h)
            }
        } else {
            $newW = $w
            $newH = $h
        }

        $bmp = New-Object System.Drawing.Bitmap($newW, $newH)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.DrawImage($img, 0, 0, $newW, $newH)
        $g.Dispose()

        $bmp.Save($dstPath, $codec, $encoderParams)
        $bmp.Dispose()
        $img.Dispose()
        Write-Host "Resized $($file.Name) -> $newW x $newH"
    } catch {
        Write-Host "Error resizing $($file.Name): $_"
    }
}

Write-Host "Done resizing."
