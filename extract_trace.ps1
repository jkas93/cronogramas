Add-Type -AssemblyName System.IO.Compression

$inputFile = "c:\Users\KEVIN AVALOS\Webs\cronogramas\Trace-20260408T165654.json.gz"
$outputFile = "c:\Users\KEVIN AVALOS\Webs\cronogramas\trace_output.json"

$stream = [System.IO.File]::OpenRead($inputFile)
$gzip = New-Object System.IO.Compression.GzipStream($stream, [System.IO.Compression.CompressionMode]::Decompress)
$outStream = [System.IO.File]::Create($outputFile)

$gzip.CopyTo($outStream)

$outStream.Close()
$gzip.Close()
$stream.Close()

$info = Get-Item $outputFile
Write-Output "Decompressed size: $($info.Length) bytes"

# Read first 8000 chars
$reader = [System.IO.StreamReader]::new($outputFile)
$buffer = New-Object char[] 8000
$read = $reader.Read($buffer, 0, 8000)
$reader.Close()

$text = New-Object string(,$buffer)
Write-Output $text.Substring(0, $read)
