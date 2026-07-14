<?php

if (!function_exists('loadEnvFile')) {
    function loadEnvFile(string $path): void
    {
        if (!is_file($path)) {
            return;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            return;
        }

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }

            [$name, $value] = array_pad(explode('=', $line, 2), 2, '');
            $name = trim($name);
            $value = trim($value);

            if ($name === '') {
                continue;
            }

            $_ENV[$name] = $value;
            putenv("{$name}={$value}");
        }
    }
}

if (!function_exists('loadAppEnv')) {
    function loadAppEnv(): void
    {
        $rootPath = dirname(__DIR__, 2);
        $backendPath = dirname(__DIR__);

        loadEnvFile($rootPath . '/.env');
        loadEnvFile($backendPath . '/.env');
    }
}
