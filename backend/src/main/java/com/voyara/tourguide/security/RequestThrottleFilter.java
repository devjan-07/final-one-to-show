package com.voyara.tourguide.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Per-instance abuse protection. Use a shared gateway limit for multiple replicas. */
@Component
public class RequestThrottleFilter extends OncePerRequestFilter {
    private final Map<String, Window> windows = new HashMap<>();

    public synchronized boolean allow(String key, int maximum, long durationMillis) {
        long now = System.currentTimeMillis();
        windows.entrySet().removeIf(entry -> entry.getValue().expiresAt <= now);
        Window window = windows.get(key);
        if (window == null) {
            if (windows.size() >= 10000) return false;
            window = new Window(now + durationMillis);
            windows.put(key, window);
        }
        return ++window.attempts <= maximum;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        if ("POST".equals(request.getMethod()) && (path.startsWith("/api/auth/") || path.equals("/api/ai-chat"))
                && !allow(path + ":" + request.getRemoteAddr(), 30, 60000)) {
            response.setStatus(429);
            response.setHeader("Retry-After", "60");
            response.setContentType("application/json");
            response.getWriter().write("{\"message\":\"Too many requests. Please try again later.\"}");
            return;
        }
        chain.doFilter(request, response);
    }

    private static final class Window {
        final long expiresAt;
        int attempts;
        Window(long expiresAt) { this.expiresAt = expiresAt; }
    }
}
