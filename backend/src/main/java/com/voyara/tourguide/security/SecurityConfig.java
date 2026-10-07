package com.voyara.tourguide.security;

import java.util.Arrays;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpMethod;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    private static final String[] PUBLIC_CATALOG_ENDPOINTS = {
            "/api/destinations", "/api/destinations/**",
            "/api/packages", "/api/packages/**",
            "/api/accommodations", "/api/accommodations/**",
            "/api/tour-guides", "/api/tour-guides/**",
            "/api/vehicles", "/api/vehicles/**",
            "/api/reviews", "/api/reviews/**"
    };

    private static final String[] MANAGEMENT_ENDPOINTS = {
            "/api/destinations", "/api/destinations/**",
            "/api/packages", "/api/packages/**",
            "/api/bookings", "/api/bookings/**",
            "/api/accommodations", "/api/accommodations/**",
            "/api/tour-guides", "/api/tour-guides/**",
            "/api/vehicles", "/api/vehicles/**"
    };

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final CustomUserDetailsService userDetailsService;
    private final boolean securityEnabled;
    private final boolean managementAuthRequired;
    private final String[] allowedOrigins;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter,
            CustomUserDetailsService userDetailsService,
            @Value("${app.security.enabled:true}") boolean securityEnabled,
            @Value("${app.management.auth-required:false}") boolean managementAuthRequired,
            @Value("${app.cors.allowed-origins}") String[] allowedOrigins
    ) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.userDetailsService = userDetailsService;
        this.securityEnabled = securityEnabled;
        if (!securityEnabled) throw new IllegalStateException("Security cannot be disabled");
        this.managementAuthRequired = managementAuthRequired;
        this.allowedOrigins = allowedOrigins;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        http
                .cors(Customizer.withDefaults())
                .csrf(AbstractHttpConfigurer::disable)
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(HttpStatus.UNAUTHORIZED.value());
                            response.setContentType("application/json");
                            response.getWriter().write("{\"status\":401,\"error\":\"Unauthorized\",\"message\":\"Authentication is required\"}");
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setStatus(HttpStatus.FORBIDDEN.value());
                            response.setContentType("application/json");
                            response.getWriter().write("{\"status\":403,\"error\":\"Forbidden\",\"message\":\"Access denied\"}");
                        })
                )
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authenticationProvider(authenticationProvider())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/register").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/verify-email").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/resend-verification-code").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/auth/me").authenticated()
                        .requestMatchers("/api/stakeholder/**").authenticated()
                        .requestMatchers(HttpMethod.GET, PUBLIC_CATALOG_ENDPOINTS).permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/ai-chat").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/ai-chat/**").permitAll()
                        .requestMatchers("/api/tourist/**").hasRole("TOURIST")
                        .requestMatchers(HttpMethod.GET, "/api/admin/tourists").hasAuthority("PERM_TOURISTS_VIEW")
                        .requestMatchers(HttpMethod.PUT, "/api/admin/tourists/**").hasAuthority("PERM_TOURISTS_EDIT")
                        .requestMatchers(HttpMethod.DELETE, "/api/admin/tourists/**").hasAuthority("PERM_TOURISTS_DELETE")
                        .requestMatchers("/api/bookings", "/api/bookings/**").hasAuthority("PERM_BOOKINGS_MANAGE")
                        .requestMatchers("/api/reports/**").hasAuthority("PERM_REPORTS_VIEW")
                        .requestMatchers(HttpMethod.GET, "/api/admin/packages", "/api/admin/packages/**").hasAuthority("PERM_PACKAGES_MANAGE")
                        .requestMatchers("/api/admin/accommodations", "/api/admin/accommodations/**",
                                "/api/admin/vehicles", "/api/admin/vehicles/**",
                                "/api/admin/tour-guides", "/api/admin/tour-guides/**").hasAuthority("PERM_INVENTORY_MANAGE")
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/destinations", "/api/destinations/**").hasAuthority("PERM_DESTINATIONS_MANAGE")
                        .requestMatchers("/api/packages", "/api/packages/**").hasAuthority("PERM_PACKAGES_MANAGE")
                        .requestMatchers(MANAGEMENT_ENDPOINTS).hasAuthority("PERM_INVENTORY_MANAGE")
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList(allowedOrigins));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Accept"));
        configuration.setExposedHeaders(Arrays.asList("Authorization"));
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
