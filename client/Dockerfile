# Multi-stage build for the client
FROM node:18-alpine AS client-builder

# Set working directory
WORKDIR /app

# Copy package files
COPY client/package*.json ./

# Install dependencies (production only for smaller image and reproducibility)
RUN npm ci --only=production

# Copy client source code
COPY client/ .

# Build the application
RUN npm run build

# Production stage with nginx
FROM nginx:alpine AS client-production

# Copy built application from builder stage
COPY --from=client-builder /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY docker/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf

# Set proper permissions (nginx user already exists in base image)
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"] 