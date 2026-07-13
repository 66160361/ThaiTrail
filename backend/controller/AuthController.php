<?php

class AuthController
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function register(array $params, array $body): array
    {
        $name     = trim($body['name']     ?? '');
        $email    = trim($body['email']    ?? '');
        $password = $body['password']      ?? '';

        if (!$name || !$email || !$password) {
            http_response_code(400);
            return ['success' => false, 'message' => 'กรุณากรอกข้อมูลให้ครบถ้วน'];
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            return ['success' => false, 'message' => 'รูปแบบอีเมลไม่ถูกต้อง'];
        }

        if (mb_strlen($password) < 6) {
            http_response_code(400);
            return ['success' => false, 'message' => 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'];
        }

        $stmt = $this->pdo->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            http_response_code(409);
            return ['success' => false, 'message' => 'อีเมลนี้ถูกใช้งานแล้ว'];
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $this->pdo->prepare(
            'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)'
        );
        $stmt->execute([$name, $email, $hash]);
        $userId = (int) $this->pdo->lastInsertId();

        $_SESSION['user_id'] = $userId;

        return [
            'success' => true,
            'user'    => [
                'id'        => $userId,
                'name'      => $name,
                'email'     => $email,
                'onboarded' => 0,
            ],
        ];
    }

    public function login(array $params, array $body): array
    {
        $email    = trim($body['email']    ?? '');
        $password = $body['password']      ?? '';

        if (!$email || !$password) {
            http_response_code(400);
            return ['success' => false, 'message' => 'กรุณากรอกอีเมลและรหัสผ่าน'];
        }

        $stmt = $this->pdo->prepare('SELECT * FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user || !password_verify($password, $user['password_hash'])) {
            http_response_code(401);
            return ['success' => false, 'message' => 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'];
        }

        $_SESSION['user_id'] = (int) $user['id'];

        return [
            'success' => true,
            'user'    => [
                'id'        => (int) $user['id'],
                'name'      => $user['name'],
                'email'     => $user['email'],
                'onboarded' => (int) $user['onboarded'],
            ],
        ];
    }

    public function logout(array $params, array $body): array
    {
        $_SESSION = [];
        session_destroy();
        return ['success' => true];
    }

    public function me(array $params, array $body): array
    {
        if (empty($_SESSION['user_id'])) {
            http_response_code(401);
            return ['success' => false, 'message' => 'Unauthorized'];
        }

        $stmt = $this->pdo->prepare(
            'SELECT id, name, email, onboarded FROM users WHERE id = ?'
        );
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            session_destroy();
            http_response_code(401);
            return ['success' => false, 'message' => 'User not found'];
        }

        $user['id']        = (int) $user['id'];
        $user['onboarded'] = (int) $user['onboarded'];

        return ['success' => true, 'user' => $user];
    }

    /**
     * POST /api/auth/google
     * Body: { id_token: string }
     *
     * Verifies the Google ID token via Google's tokeninfo endpoint,
     * then finds or creates the user and starts a session.
     */
    public function google(array $params, array $body): array
    {
        $idToken = trim($body['id_token'] ?? '');

        if (!$idToken) {
            http_response_code(400);
            return ['success' => false, 'message' => 'Missing id_token'];
        }

        // Verify token with Google
        $payload = $this->verifyGoogleToken($idToken);

        if (!$payload || isset($payload['error'])) {
            http_response_code(401);
            return ['success' => false, 'message' => 'Google token ไม่ถูกต้อง'];
        }

        $googleId  = $payload['sub']     ?? '';
        $email     = $payload['email']   ?? '';
        $name      = $payload['name']    ?? ($payload['given_name'] ?? 'ผู้ใช้งาน');
        $avatarUrl = $payload['picture'] ?? '';

        if (!$googleId || !$email) {
            http_response_code(401);
            return ['success' => false, 'message' => 'ข้อมูลจาก Google ไม่ครบถ้วน'];
        }

        // Find or create user
        $stmt = $this->pdo->prepare('SELECT * FROM users WHERE google_id = ? LIMIT 1');
        $stmt->execute([$googleId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user) {
            // Update name / avatar in case they changed
            $upd = $this->pdo->prepare(
                'UPDATE users SET name = ?, avatar_url = ? WHERE id = ?'
            );
            $upd->execute([$name, $avatarUrl, $user['id']]);
        } else {
            // New user — check if email already registered another way
            $byEmail = $this->pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
            $byEmail->execute([$email]);
            $existing = $byEmail->fetch(PDO::FETCH_ASSOC);

            if ($existing) {
                // Link Google ID to existing account
                $link = $this->pdo->prepare(
                    'UPDATE users SET google_id = ?, avatar_url = ? WHERE id = ?'
                );
                $link->execute([$googleId, $avatarUrl, $existing['id']]);
                $user = ['id' => $existing['id']];
            } else {
                // Brand-new user
                $ins = $this->pdo->prepare(
                    'INSERT INTO users (google_id, name, email, avatar_url) VALUES (?, ?, ?, ?)'
                );
                $ins->execute([$googleId, $name, $email, $avatarUrl]);
                $user = ['id' => (int) $this->pdo->lastInsertId()];
            }

            // Reload full row
            $stmt->execute([$googleId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
        }

        $_SESSION['user_id'] = (int) $user['id'];

        return [
            'success' => true,
            'user'    => [
                'id'         => (int) $user['id'],
                'name'       => $user['name'],
                'email'      => $user['email'],
                'avatar_url' => $user['avatar_url'] ?? '',
                'onboarded'  => (int) ($user['onboarded'] ?? 0),
            ],
        ];
    }

    private function verifyGoogleToken(string $idToken): ?array
    {
        if (!function_exists('curl_init')) {
            // Fallback: decode without verification (development only)
            $parts   = explode('.', $idToken);
            $payload = json_decode(base64_decode(strtr($parts[1] ?? '', '-_', '+/')), true);
            return $payload ?: null;
        }

        $ch = curl_init(
            'https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($idToken)
        );
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        $result = curl_exec($ch);
        curl_close($ch);

        return $result ? json_decode($result, true) : null;
    }
}
