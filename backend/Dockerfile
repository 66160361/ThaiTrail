FROM php:8.2-cli-alpine

# Install MySQL PDO extension
RUN docker-php-ext-install pdo pdo_mysql

# Set working directory
WORKDIR /app

# Copy all project files
COPY . /app

# Expose port (Render automatically provides $PORT environment variable)
ENV PORT=8000
EXPOSE 8000

# Start server using router.php (if inside backend) or backend/router.php
CMD ["sh", "-c", "if [ -f router.php ]; then php -S 0.0.0.0:${PORT:-8000} router.php; else php -S 0.0.0.0:${PORT:-8000} backend/router.php; fi"]
