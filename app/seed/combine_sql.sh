#!/bin/bash

# Function to read file content
get_file_content() {
    local file_path="$1"
    if [ -f "$file_path" ]; then
        cat "$file_path"
    else
        echo "Warning: File not found: $file_path" >&2
        echo ""
    fi
}

# Initialize the combined SQL variable
combined_sql="-- Combined SQL Migration Script\n\n"

# Extensions
combined_sql+="-- Extensions\n"
combined_sql+="$(get_file_content "sql/00_extensions.sql")"
combined_sql+="\n\n"

# Schema files
combined_sql+="-- Schema Files\n"
combined_sql+="$(get_file_content "sql/01_schema/01_enum_types.sql")"
combined_sql+="\n\n"
combined_sql+="$(get_file_content "sql/01_schema/02_core_tables.sql")"
combined_sql+="\n\n"
combined_sql+="$(get_file_content "sql/01_schema/03_event_tables.sql")"
combined_sql+="\n\n"
combined_sql+="$(get_file_content "sql/01_schema/04_indexes.sql")"
combined_sql+="\n\n"
combined_sql+="$(get_file_content "sql/01_schema/05_holidays.sql")"
combined_sql+="\n\n"

# Function files
combined_sql+="-- Function Files\n"
combined_sql+="$(get_file_content "sql/02_functions/01_utils.sql")"
combined_sql+="\n\n"
combined_sql+="$(get_file_content "sql/02_functions/02_leave_classification.sql")"
combined_sql+="\n\n"
combined_sql+="$(get_file_content "sql/02_functions/03_vacation_calculations.sql")"
combined_sql+="\n\n"
combined_sql+="$(get_file_content "sql/02_functions/04_event_management.sql")"
combined_sql+="\n\n"
combined_sql+="$(get_file_content "sql/02_functions/05_balance_management.sql")"
combined_sql+="\n\n"
combined_sql+="$(get_file_content "sql/02_functions/06_holiday_functions.sql")"
combined_sql+="\n\n"

# Trigger files
combined_sql+="-- Trigger Files\n"
combined_sql+="$(get_file_content "sql/03_triggers/01_vacation_triggers.sql")"
combined_sql+="\n\n"
combined_sql+="$(get_file_content "sql/03_triggers/02_user_triggers.sql")"
combined_sql+="\n\n"

# Procedure files
combined_sql+="-- Procedure Files\n"
combined_sql+="$(get_file_content "sql/04_procedures/01_maintenance_procedures.sql")"
combined_sql+="\n\n"

# Initialization file
combined_sql+="-- Initialization\n"
combined_sql+="$(get_file_content "sql/05_initialization.sql")"

# Write to file
echo -e "$combined_sql" > "combined_migration.sql"

echo "Combined SQL file created at: combined_migration.sql"