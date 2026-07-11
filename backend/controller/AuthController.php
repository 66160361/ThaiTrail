<?php

class AuthController
{
    private string $googleClientId;
    private PDO $pdo;

    public function __construct(PDO $pdo, string $googleClientId)
    {
        $this->pdo = $pdo;
        $this->googleClientId = trim($googleClientId);
    }

    public function loginWithGoogle(array $payload): array
    {
        if ($this->googleClientId === '') {
            throw new RuntimeException('Google client id is not configured on server');
        }

        $credential = trim((string) ($payload['credential'] ?? ''));
        if ($credential === '') {
            throw new InvalidArgumentException('Missing Google credential token');
        }

        $tokenInfo = $this->fetchGoogleTokenInfo($credential);
        $audience = (string) ($tokenInfo['aud'] ?? '');

        if ($audience !== $this->googleClientId) {
            throw new RuntimeException('Google token audience mismatch');
        }

        $expiresAt = (int) ($tokenInfo['exp'] ?? 0);
        if ($expiresAt > 0 && $expiresAt < time()) {
            throw new RuntimeException('Google token expired');
        }

        $emailVerified = (string) ($tokenInfo['email_verified'] ?? 'false');
        if ($emailVerified !== 'true') {
            throw new RuntimeException('Google account email is not verified');
        }

        $googleId = (string) ($tokenInfo['sub'] ?? '');
        $email = (string) ($tokenInfo['email'] ?? '');
        if ($googleId === '' || $email === '') {
            throw new RuntimeException('Google token missing required profile fields');
        }

        $profile = [
            'google_id' => $googleId,
            'email' => $email,
            'name' => (string) ($tokenInfo['name'] ?? ''),
            'given_name' => (string) ($tokenInfo['given_name'] ?? ''),
            'family_name' => (string) ($tokenInfo['family_name'] ?? ''),
            'picture' => (string) ($tokenInfo['picture'] ?? ''),
        ];

        $userId = $this->saveUser($profile);
        $profile['id'] = $userId;

        return [
            'success' => true,
            'user' => $profile,
        ];
    }

    private function saveUser(array $profile): int
    {
        $this->ensureUsersTableExists();

        $columns = $this->getUsersTableColumns();
        if ($columns === []) {
            throw new RuntimeException('Users table schema is unavailable');
        }

        $params = [];
        $insertColumns = [];
        $insertValues = [];
        $updateAssignments = [];

        $addField = function (string $column, string $param, mixed $value, bool $update = true) use (&$params, &$insertColumns, &$insertValues, &$updateAssignments): void {
            $insertColumns[] = "`{$column}`";
            $insertValues[] = ":{$param}";
            $params[$param] = $value;

            if ($update) {
                $updateAssignments[] = "`{$column}` = VALUES(`{$column}`)";
            }
        };

        if (isset($columns['google_id'])) {
            $addField('google_id', 'google_id', $profile['google_id']);
        }
        if (isset($columns['email'])) {
            $addField('email', 'email', $profile['email']);
        }
        if (isset($columns['name'])) {
            $addField('name', 'name', $profile['name'] ?: null);
        }
        if (isset($columns['given_name'])) {
            $addField('given_name', 'given_name', $profile['given_name'] ?: null);
        }
        if (isset($columns['family_name'])) {
            $addField('family_name', 'family_name', $profile['family_name'] ?: null);
        }
        if (isset($columns['picture'])) {
            $addField('picture', 'picture', $profile['picture'] ?: null);
        } elseif (isset($columns['avatar_url'])) {
            $addField('avatar_url', 'avatar_url', $profile['picture'] ?: null);
        }
        if (isset($columns['role'])) {
            $addField('role', 'role', 'user', false);
        }

        if (isset($columns['last_login_at'])) {
            $insertColumns[] = '`last_login_at`';
            $insertValues[] = 'NOW()';
            $updateAssignments[] = '`last_login_at` = NOW()';
        }

        if ($insertColumns === []) {
            throw new RuntimeException('Users table has no writable columns');
        }

        $updateAssignments[] = '`id` = LAST_INSERT_ID(`id`)';

        $sql = sprintf(
            'INSERT INTO users (%s) VALUES (%s) ON DUPLICATE KEY UPDATE %s',
            implode(', ', $insertColumns),
            implode(', ', $insertValues),
            implode(', ', array_unique($updateAssignments))
        );

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        return (int) $this->pdo->lastInsertId();
    }

    private function getUsersTableColumns(): array
    {
        $rows = $this->pdo->query('DESCRIBE users')->fetchAll(PDO::FETCH_ASSOC);
        $columns = [];

        foreach ($rows as $row) {
            $field = (string) ($row['Field'] ?? '');
            if ($field !== '') {
                $columns[$field] = true;
            }
        }

        return $columns;
    }

    private function ensureUsersTableExists(): void
    {
        $this->pdo->exec(
            "CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                google_id VARCHAR(100) NOT NULL UNIQUE,
                email VARCHAR(255) NOT NULL,
                name VARCHAR(255) NULL,
                given_name VARCHAR(255) NULL,
                family_name VARCHAR(255) NULL,
                picture TEXT NULL,
                last_login_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_users_email (email)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );
    }

    private function fetchGoogleTokenInfo(string $credential): array
    {
        $endpoint = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . rawurlencode($credential);
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'timeout' => 10,
                'ignore_errors' => true,
                'header' => "Accept: application/json\r\n",
            ],
        ]);

        $response = @file_get_contents($endpoint, false, $context);
        if ($response === false) {
            throw new RuntimeException('Unable to validate token with Google');
        }

        $data = json_decode($response, true);
        if (!is_array($data)) {
            throw new RuntimeException('Invalid response from Google tokeninfo');
        }

        if (isset($data['error_description']) || isset($data['error'])) {
            $message = (string) ($data['error_description'] ?? $data['error']);
            throw new RuntimeException($message !== '' ? $message : 'Google token validation failed');
        }

        return $data;
    }
}