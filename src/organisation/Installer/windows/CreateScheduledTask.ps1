$scriptPath = ".\Update.bat"
$taskName = "updateExeFile"

# Read the trigger interval from the file
$triggerIntervalMinutes = Get-Content -Path "TriggerInterval.txt" | Select-String -Pattern 'TimeForUpdate='
$triggerIntervalMinutes = $triggerIntervalMinutes -replace 'TimeForUpdate=', '' -as [int]

# Check if the content was read and converted to an integer properly
if ($triggerIntervalMinutes -ne $null) {
    # Calculate the time frames based on the value read from the file
    $triggerInterval = New-TimeSpan -Minutes $triggerIntervalMinutes
    $repetitionDuration = New-TimeSpan -Days 365  # Set the repetition duration in days

    # Format the start time in the correct string format
    $startTime = (Get-Date).AddMinutes($triggerIntervalMinutes).ToString('HH:mm')

    # Convert time spans to string representations
    $triggerIntervalMinutesStr = $triggerInterval.TotalMinutes.ToString()
    $repetitionDurationDaysStr = $repetitionDuration.TotalDays.ToString()

    # Create a new scheduled task using CMD commands
    $cmdCommand = @"
    schtasks /Create /TN "$taskName" /TR "$scriptPath" /SC ONCE /ST $startTime /RI $triggerIntervalMinutesStr /DU $repetitionDurationDaysStr /F
"@

    try {
        Invoke-Expression -Command $cmdCommand
        Write-Host "Scheduled task '$taskName' created successfully!"
    } catch {
        Write-Host "Failed to create scheduled task: $_"
    }
} else {
    Write-Host "Failed to read trigger interval from the file or it's not in the expected format."
}
