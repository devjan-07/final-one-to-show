package com.voyara.tourguide.config;

import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@RequiredArgsConstructor
public class SchemaCleanupRunner implements ApplicationRunner {
    private static final String SCHEMA_HISTORY_TABLE = "voyara_schema_history";
    private static final int SCHEMA_VERSION = 2;

    private final JdbcTemplate jdbcTemplate;

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void run(ApplicationArguments args) {
        if (schemaVersionApplied()) {
            return;
        }

        jdbcTemplate.execute("DECLARE @result int; EXEC @result = sys.sp_getapplock " +
                "@Resource=N'voyara_schema_migrations', @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=120000; " +
                "IF @result < 0 THROW 51000, 'Could not acquire schema migration lock', 1;");
        jdbcTemplate.execute("IF OBJECT_ID('dbo.voyara_schema_history', 'U') IS NULL " +
                "CREATE TABLE dbo.voyara_schema_history (version int NOT NULL PRIMARY KEY, applied_at datetime2 NOT NULL DEFAULT SYSUTCDATETIME())");
        if (schemaVersionApplied()) {
            return;
        }

        migrateLegacyResourceIdColumn("package_resource_id", "package_id");
        migrateLegacyResourceIdColumn("guide_resource_id", "guide_id");
        migrateLegacyResourceIdColumn("accommodation_resource_id", "accommodation_id");
        migrateLegacyResourceIdColumn("vehicle_resource_id", "vehicle_id");
        migrateLegacyTextColumn("pkg", "package_name_snapshot");
        migrateLegacyTextColumn("guide", "guide_name_snapshot");
        migrateLegacyTextColumn("accommodation", "accommodation_name_snapshot");
        migrateLegacyTextColumn("vehicle", "vehicle_name_snapshot");
        migrateLegacyTourPackageIncludedColumn();
        dropLegacyDestinationToursColumn();
        addColumnIfMissing("vehicle", "rating", "float NOT NULL CONSTRAINT [df_vehicle_rating] DEFAULT 0");
        addColumnIfMissing("vehicle", "reviews", "int NOT NULL CONSTRAINT [df_vehicle_reviews] DEFAULT 0");
        addColumnIfMissing("booking", "overall_rating", "int NULL");
        addColumnIfMissing("booking", "overall_rating_description", "nvarchar(255) NULL");
        addColumnIfMissing("booking", "overall_review", "nvarchar(max) NULL");
        addColumnIfMissing("payments", "card_brand", "nvarchar(255) NULL");
        addColumnIfMissing("payments", "card_last4", "nvarchar(4) NULL");
        ensureLongTextColumn("vehicle", "image");
        ensureLongTextColumn("accommodation", "image");
        ensureLongTextColumn("tour_package", "image");
        ensureLongTextColumn("destination", "image");
        ensureLongTextColumn("booking", "notes");
        ensureAccommodationDestinationForeignKey();
        clearUnsupportedRatings();
        dropLegacyMealPlanColumn();
        jdbcTemplate.update("INSERT INTO dbo.voyara_schema_history(version) VALUES (?)", SCHEMA_VERSION);
    }

    private boolean schemaVersionApplied() {
        if (!tableExists(SCHEMA_HISTORY_TABLE)) {
            return false;
        }

        Integer applied = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM dbo.voyara_schema_history WHERE version = ?",
            Integer.class,
            SCHEMA_VERSION
        );
        return applied != null && applied > 0;
    }

    private void clearUnsupportedRatings() {
        jdbcTemplate.update("UPDATE dbo.destination SET rating = 0, reviews = 0");
        jdbcTemplate.update("UPDATE dbo.tour_package SET rating = 0, reviews = 0");
        log.info("Cleared destination and tour package ratings because those resources are not review targets");
    }

    private void ensureLongTextColumn(String tableName, String columnName) {
        if (!columnExists(tableName, columnName)) {
            return;
        }

        Integer maxLength = jdbcTemplate.queryForObject(
            "SELECT c.max_length FROM sys.columns c " +
                "JOIN sys.tables t ON t.object_id = c.object_id " +
                "JOIN sys.schemas s ON s.schema_id = t.schema_id " +
                "WHERE s.name = 'dbo' AND t.name = ? AND c.name = ?",
            Integer.class,
            tableName,
            columnName
        );
        if (Integer.valueOf(-1).equals(maxLength)) {
            return;
        }

        jdbcTemplate.execute(
            "ALTER TABLE dbo." + sqlServerIdentifier(tableName) + " ALTER COLUMN " +
                sqlServerIdentifier(columnName) + " nvarchar(max) NULL"
        );
        log.info("Expanded dbo.{}.{} to nvarchar(max)", tableName, columnName);
    }

    private void addColumnIfMissing(String tableName, String columnName, String definition) {
        if (columnExists(tableName, columnName)) {
            return;
        }

        jdbcTemplate.execute(
            "ALTER TABLE dbo." + sqlServerIdentifier(tableName) + " ADD " +
                sqlServerIdentifier(columnName) + " " + definition
        );
        log.info("Added missing dbo.{}.{} column", tableName, columnName);
    }

    private void ensureAccommodationDestinationForeignKey() {
        if (!columnExists("accommodation", "destination_id")) {
            return;
        }

        jdbcTemplate.update(
            "UPDATE a SET destination_id = NULL FROM dbo.accommodation a " +
                "WHERE a.destination_id IS NOT NULL AND NOT EXISTS " +
                "(SELECT 1 FROM dbo.destination d WHERE d.id = a.destination_id)"
        );
        jdbcTemplate.update(
            "UPDATE a SET destination_id = match.id FROM dbo.accommodation a " +
                "CROSS APPLY (SELECT TOP 1 d.id FROM dbo.destination d " +
                "WHERE a.location IS NOT NULL AND (LOWER(d.name) LIKE '%' + LOWER(a.location) + '%' " +
                "OR LOWER(a.location) LIKE '%' + LOWER(d.name) + '%') ORDER BY d.id) match " +
                "WHERE a.destination_id IS NULL"
        );

        Integer constraintExists = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM sys.foreign_keys WHERE name = 'fk_accommodation_destination' " +
                "AND parent_object_id = OBJECT_ID('dbo.accommodation')",
            Integer.class
        );
        if (constraintExists != null && constraintExists > 0) {
            return;
        }

        jdbcTemplate.execute(
            "ALTER TABLE dbo.accommodation WITH CHECK ADD CONSTRAINT fk_accommodation_destination " +
                "FOREIGN KEY (destination_id) REFERENCES dbo.destination(id)"
        );
        log.info("Added accommodation destination foreign key");
    }

    private void migrateLegacyResourceIdColumn(String legacyColumn, String canonicalColumn) {
        if (!columnExists("booking", legacyColumn)) {
            return;
        }

        if (!columnExists("booking", canonicalColumn)) {
            jdbcTemplate.execute("ALTER TABLE dbo.booking ADD " + sqlServerIdentifier(canonicalColumn) + " bigint NULL");
        }

        jdbcTemplate.execute(
            "UPDATE dbo.booking SET " + sqlServerIdentifier(canonicalColumn) + " = " + sqlServerIdentifier(legacyColumn) + " " +
                "WHERE " + sqlServerIdentifier(canonicalColumn) + " IS NULL AND " + sqlServerIdentifier(legacyColumn) + " IS NOT NULL"
        );

        dropColumn("booking", legacyColumn);
        log.info("Migrated legacy dbo.booking.{} column to {}", legacyColumn, canonicalColumn);
    }

    private void migrateLegacyTextColumn(String legacyColumn, String canonicalColumn) {
        if (!columnExists("booking", legacyColumn)) {
            return;
        }

        if (!columnExists("booking", canonicalColumn)) {
            jdbcTemplate.execute("ALTER TABLE dbo.booking ADD " + sqlServerIdentifier(canonicalColumn) + " nvarchar(255) NULL");
        }

        jdbcTemplate.execute(
            "UPDATE dbo.booking SET " + sqlServerIdentifier(canonicalColumn) + " = " + sqlServerIdentifier(legacyColumn) + " " +
                "WHERE " + sqlServerIdentifier(canonicalColumn) + " IS NULL AND " + sqlServerIdentifier(legacyColumn) + " IS NOT NULL"
        );

        dropColumn("booking", legacyColumn);
        log.info("Migrated legacy dbo.booking.{} column to {}", legacyColumn, canonicalColumn);
    }

    private void migrateLegacyTourPackageIncludedColumn() {
        if (!columnExists("tour_package", "included")) {
            return;
        }

        if (!columnExists("tour_package", "included_items")) {
            jdbcTemplate.execute("ALTER TABLE dbo.tour_package ADD [included_items] nvarchar(255) NULL");
        }

        jdbcTemplate.execute(
            "UPDATE dbo.tour_package SET [included_items] = [included] " +
                "WHERE [included_items] IS NULL AND [included] IS NOT NULL"
        );
        dropColumn("tour_package", "included");
        log.info("Migrated and removed legacy dbo.tour_package.included column");
    }

    private void dropLegacyDestinationToursColumn() {
        if (!columnExists("destination", "tours")) {
            return;
        }
        dropColumn("destination", "tours");
        log.info("Removed legacy dbo.destination.tours column");
    }

    private void dropLegacyMealPlanColumn() {
        if (!columnExists("booking", "meal_plan")) {
            return;
        }

        dropColumn("booking", "meal_plan");
        log.info("Dropped legacy dbo.booking.meal_plan column");
    }

    private boolean columnExists(String tableName, String columnName) {
        Integer exists = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM sys.columns c " +
                "JOIN sys.tables t ON t.object_id = c.object_id " +
                "JOIN sys.schemas s ON s.schema_id = t.schema_id " +
                "WHERE s.name = 'dbo' AND t.name = ? AND c.name = ?",
            Integer.class,
            tableName,
            columnName
        );

        return exists != null && exists > 0;
    }

    private boolean tableExists(String tableName) {
        Integer exists = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM sys.tables t " +
                "JOIN sys.schemas s ON s.schema_id = t.schema_id " +
                "WHERE s.name = 'dbo' AND t.name = ?",
            Integer.class,
            tableName
        );

        return exists != null && exists > 0;
    }

    private void dropColumn(String tableName, String columnName) {
        List<String> defaultConstraints = jdbcTemplate.queryForList(
            "SELECT dc.name FROM sys.default_constraints dc " +
                "JOIN sys.columns c ON c.default_object_id = dc.object_id " +
                "JOIN sys.tables t ON t.object_id = c.object_id " +
                "JOIN sys.schemas s ON s.schema_id = t.schema_id " +
                "WHERE s.name = 'dbo' AND t.name = ? AND c.name = ?",
            String.class,
            tableName,
            columnName
        );

        for (String constraint : defaultConstraints) {
            jdbcTemplate.execute("ALTER TABLE dbo." + sqlServerIdentifier(tableName) + " DROP CONSTRAINT " + sqlServerIdentifier(constraint));
        }

        jdbcTemplate.execute(
            "ALTER TABLE dbo." + sqlServerIdentifier(tableName) + " DROP COLUMN " + sqlServerIdentifier(columnName)
        );
    }

    private String sqlServerIdentifier(String value) {
        return "[" + value.replace("]", "]]") + "]";
    }
}
