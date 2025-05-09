$combinedSql = ""

# Function to read file content
function Get-FileContent {
    param (
        [string]$path
    )
    
    if (Test-Path $path) {
        Get-Content -Path $path -Raw
    } else {
        Write-Warning "File not found: $path"
        ""
    }
}

# Add file contents in order
$combinedSql += "-- Combined SQL Migration Script`n`n"

# Extensions
$combinedSql += "-- Extensions`n"
$combinedSql += Get-FileContent "sql\00_extensions.sql"
$combinedSql += "`n`n"

# Schema
$combinedSql += "-- Schema Files`n"
$combinedSql += Get-FileContent "sql\01_schema\01_enum_types.sql"
$combinedSql += "`n`n"
$combinedSql += Get-FileContent "sql\01_schema\02_core_tables.sql"
$combinedSql += "`n`n"
$combinedSql += Get-FileContent "sql\01_schema\03_event_tables.sql"
$combinedSql += "`n`n"
$combinedSql += Get-FileContent "sql\01_schema\04_indexes.sql"
$combinedSql += "`n`n"
$combinedSql += Get-FileContent "sql\01_schema\05_holidays.sql"
$combinedSql += "`n`n"

# Functions
$combinedSql += "-- Function Files`n"
$combinedSql += Get-FileContent "sql\02_functions\01_utils.sql"
$combinedSql += "`n`n"
$combinedSql += Get-FileContent "sql\02_functions\02_leave_classification.sql"
$combinedSql += "`n`n"
$combinedSql += Get-FileContent "sql\02_functions\03_vacation_calculations.sql"
$combinedSql += "`n`n"
$combinedSql += Get-FileContent "sql\02_functions\04_event_management.sql"
$combinedSql += "`n`n"
$combinedSql += Get-FileContent "sql\02_functions\05_balance_management.sql"
$combinedSql += "`n`n"
$combinedSql += Get-FileContent "sql\02_functions\06_holiday_functions.sql"
$combinedSql += "`n`n"

# Triggers
$combinedSql += "-- Trigger Files`n"
$combinedSql += Get-FileContent "sql\03_triggers\01_vacation_triggers.sql"
$combinedSql += "`n`n"
$combinedSql += Get-FileContent "sql\03_triggers\02_user_triggers.sql"
$combinedSql += "`n`n"

# Procedures
$combinedSql += "-- Procedure Files`n"
$combinedSql += Get-FileContent "sql\04_procedures\01_maintenance_procedures.sql"
$combinedSql += "`n`n"

# Initialization
$combinedSql += "-- Initialization`n"
$combinedSql += Get-FileContent "sql\05_initialization.sql"

# Write to file
$combinedSql | Out-File -FilePath "combined_migration.sql" -Encoding utf8

Write-Host "Combined SQL file created at: combined_migration.sql"