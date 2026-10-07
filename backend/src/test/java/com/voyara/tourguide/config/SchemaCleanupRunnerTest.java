package com.voyara.tourguide.config;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.mockito.Mockito.*;

class SchemaCleanupRunnerTest {
    @Test void appliedMigrationDoesNotRepeatDataCleanupOnRestart() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForObject(
            "SELECT COUNT(*) FROM sys.tables t JOIN sys.schemas s ON s.schema_id = t.schema_id WHERE s.name = 'dbo' AND t.name = ?",
            Integer.class,
            "voyara_schema_history"
        )).thenReturn(1);
        when(jdbc.queryForObject("SELECT COUNT(*) FROM dbo.voyara_schema_history WHERE version = ?", Integer.class, 2)).thenReturn(1);
        new SchemaCleanupRunner(jdbc).run(null);
        verify(jdbc, never()).execute(contains("sp_getapplock"));
        verify(jdbc, never()).update("UPDATE dbo.destination SET rating = 0, reviews = 0");
        verify(jdbc, never()).update("UPDATE dbo.tour_package SET rating = 0, reviews = 0");
        verify(jdbc, never()).update("INSERT INTO dbo.voyara_schema_history(version) VALUES (2)");
    }
}
