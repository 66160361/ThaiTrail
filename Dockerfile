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

# Start server using backend/router.php
CMD ["sh", "-c", "php -S 0.0.0.0:${PORT:-8000} backend/router.php"]
