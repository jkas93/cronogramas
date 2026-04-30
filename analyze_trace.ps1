Add-Type -AssemblyName System.IO.Compression

$inputFile = "c:\Users\KEVIN AVALOS\Webs\cronogramas\Trace-20260408T165654.json.gz"

$stream = [System.IO.File]::OpenRead($inputFile)
$gzip = New-Object System.IO.Compression.GzipStream($stream, [System.IO.Compression.CompressionMode]::Decompress)
$reader = New-Object System.IO.StreamReader($gzip)
$content = $reader.ReadToEnd()
$reader.Close(); $gzip.Close(); $stream.Close()

# Parse JSON
$data = $content | ConvertFrom-Json

$report = {
    # Metadata
    Write-Output "=========================================="
    Write-Output "  TRACE FILE ANALYSIS"
    Write-Output "=========================================="
    Write-Output ""
    Write-Output "--- METADATA ---"
    Write-Output "Source: $($data.metadata.source)"
    Write-Output "Start Time: $($data.metadata.startTime)"
    Write-Output "Data Origin: $($data.metadata.dataOrigin)"
    Write-Output "Host DPR: $($data.metadata.hostDPR)"
    Write-Output "URL: $($data.metadata.cruxFieldData[0].normalizedUrl)"
    Write-Output ""

    $events = $data.traceEvents
    Write-Output "Total Events: $($events.Count)"
    Write-Output ""

    # Process names
    $processes = @{}
    foreach ($ev in $events) {
        if ($ev.name -eq "process_name" -and $ev.args.name) {
            $processes["$($ev.pid)"] = $ev.args.name
        }
    }

    Write-Output "--- PROCESSES ---"
    foreach ($p in $processes.GetEnumerator()) {
        Write-Output "  PID $($p.Key): $($p.Value)"
    }
    Write-Output ""

    # Categories
    $categories = @{}
    $longTasks = @()
    $screenshots = 0
    $layoutShifts = @()

    foreach ($ev in $events) {
        if ($ev.cat) {
            $categories[$ev.cat] = ($categories[$ev.cat] + 1)
        }
        if ($ev.name -eq "Screenshot") { $screenshots++ }
        if ($ev.name -eq "RunTask" -and $ev.dur -gt 50000) {
            $longTasks += [PSCustomObject]@{
                Duration = [math]::Round($ev.dur / 1000, 1)
                PID = $ev.pid
                TID = $ev.tid
            }
        }
        if ($ev.name -eq "LayoutShift") {
            $layoutShifts += $ev
        }
    }

    Write-Output "--- TOP EVENT CATEGORIES ---"
    $categories.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 10 | ForEach-Object {
        Write-Output "  $($_.Value) events - $($_.Key)"
    }
    Write-Output ""

    Write-Output "--- LONG TASKS (>50ms) ---"
    Write-Output "  Count: $($longTasks.Count)"
    if ($longTasks.Count -gt 0) {
        $sorted = $longTasks | Sort-Object Duration -Descending | Select-Object -First 10
        Write-Output "  Top 10 longest:"
        foreach ($t in $sorted) {
            $procName = if ($processes.ContainsKey("$($t.PID)")) { $processes["$($t.PID)"] } else { "Unknown" }
            Write-Output "    $($t.Duration)ms - Process: $procName (PID: $($t.PID))"
        }
    }
    Write-Output ""

    Write-Output "--- SCREENSHOTS ---"
    Write-Output "  Count: $screenshots"
    Write-Output ""

    Write-Output "--- LAYOUT SHIFTS ---"
    Write-Output "  Count: $($layoutShifts.Count)"
    Write-Output ""

    Write-Output "--- WEB VITALS MARKERS ---"
    foreach ($ev in $events) {
        if ($ev.name -eq "largestContentfulPaint::Candidate" -or $ev.name -eq "LargestContentfulPaint::Candidate") {
            Write-Output "  LCP Candidate found at ts: $($ev.ts)"
        }
        if ($ev.name -eq "firstContentfulPaint" -or $ev.name -eq "firstPaint") {
            Write-Output "  $($ev.name) at ts: $($ev.ts)"
        }
        if ($ev.name -eq "MarkDOMContent") {
            Write-Output "  DOMContentLoaded at ts: $($ev.ts)"
        }
        if ($ev.name -eq "MarkLoad") {
            Write-Output "  Load at ts: $($ev.ts)"
        }
    }
    Write-Output ""
    Write-Output "=========================================="
    Write-Output "  ANALYSIS COMPLETE"
    Write-Output "=========================================="
}

& $report | Out-File "c:\Users\KEVIN AVALOS\Webs\cronogramas\trace_report.txt" -Encoding utf8

