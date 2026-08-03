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
                'id'         => $userId,
                'name'       => $name,
                'email'      => $email,
                'avatar_url' => '',
                'onboarded'  => 0,
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
                'id'         => (int) $user['id'],
                'name'       => $user['name'],
                'email'      => $user['email'],
                'avatar_url' => $user['avatar_url'] ?? '',
                'onboarded'  => (int) $user['onboarded'],
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
            'SELECT id, name, email, avatar_url, onboarded FROM users WHERE id = ?'
        );
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            session_destroy();
            http_response_code(401);
            return ['success' => false, 'message' => 'User not found'];
        }

        $user['id']         = (int) $user['id'];
        $user['onboarded']  = (int) $user['onboarded'];
        $user['avatar_url'] = $user['avatar_url'] ?? '';

        return ['success' => true, 'user' => $user];
    }

    /**
     * POST /api/auth/google
     * Body: { credential: string } (from Google Identity Services)
     *
     * Verifies the Google ID token via Google's tokeninfo endpoint,
     * then finds or creates the user and starts a session.
     */
    public function google(array $params, array $body): array
    {
        $credential = trim($body['credential'] ?? $body['id_token'] ?? '');

        if (!$credential) {
            http_response_code(400);
            return ['success' => false, 'message' => 'Missing credential'];
        }

        // Verify token with Google
        $payload = $this->verifyGoogleToken($credential);

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
            // Update avatar_url only if empty — preserve user-uploaded avatar and edited name
            if (empty($user['avatar_url']) && !empty($avatarUrl)) {
                $upd = $this->pdo->prepare(
                    'UPDATE users SET avatar_url = ? WHERE id = ?'
                );
                $upd->execute([$avatarUrl, $user['id']]);

                // Reload fresh row after update
                $reload = $this->pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
                $reload->execute([$user['id']]);
                $user = $reload->fetch(PDO::FETCH_ASSOC);
            }
        } else {
            // New user — check if email already registered another way
            $byEmail = $this->pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
            $byEmail->execute([$email]);
            $existing = $byEmail->fetch(PDO::FETCH_ASSOC);

            if ($existing) {
                // Link Google ID to existing account (preserve their name)
                $link = $this->pdo->prepare(
                    'UPDATE users SET google_id = ?, avatar_url = ? WHERE id = ?'
                );
                $link->execute([$googleId, $avatarUrl, $existing['id']]);
            } else {
                // Brand-new user — default name is 'anonymous', user can change it later
                $ins = $this->pdo->prepare(
                    'INSERT INTO users (google_id, name, email, avatar_url) VALUES (?, ?, ?, ?)'
                );
                $ins->execute([$googleId, 'anonymous', $email, $avatarUrl]);
            }

            // Reload full row
            $stmt->execute([$googleId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
        }

        $_SESSION['user_id'] = (int) $user['id'];

        // Auto-sync: if user has interests in user_interests table, mark as onboarded
        if (!(int)($user['onboarded'] ?? 0)) {
            $chk = $this->pdo->prepare(
                'SELECT COUNT(*) FROM user_interests WHERE user_id = ?'
            );
            $chk->execute([$user['id']]);
            $interestCount = (int) $chk->fetchColumn();

            if ($interestCount > 0) {
                $this->pdo->prepare('UPDATE users SET onboarded = 1 WHERE id = ?')
                    ->execute([$user['id']]);
                $user['onboarded'] = 1;
            }
        }

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

    public function profile(array $params, array $body): array
    {
        if (empty($_SESSION['user_id'])) {
            http_response_code(401);
            return ['success' => false, 'message' => 'Unauthorized'];
        }

        $userId = (int) $_SESSION['user_id'];

        // 1. Fetch user info
        $stmt = $this->pdo->prepare('SELECT * FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            http_response_code(404);
            return ['success' => false, 'message' => 'User not found'];
        }

        // 2. Fetch interests
        $interestStmt = $this->pdo->prepare('
            SELECT c.category_name FROM user_interests ui
            JOIN categories c ON c.id = ui.category_id
            WHERE ui.user_id = ?
            ORDER BY ui.weight DESC
        ');
        $interestStmt->execute([$userId]);
        $interests = $interestStmt->fetchAll(PDO::FETCH_COLUMN);

        // Helper to parse time strings/arrays
        $toTimeArray = function($value) {
            if ($value === null || $value === '') return [];
            $decoded = json_decode($value, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                return array_values(array_filter($decoded, static fn($item) => $item !== null && $item !== ''));
            }
            if (str_contains($value, ',')) {
                return array_values(array_filter(array_map('trim', explode(',', $value)), static fn($item) => $item !== ''));
            }
            return [trim($value)];
        };

        $normalizePlace = function(array $place) use ($toTimeArray) {
            if (array_key_exists('opening_time', $place)) {
                $place['opening_time'] = $toTimeArray($place['opening_time']);
            }
            if (array_key_exists('closing_time', $place)) {
                $place['closing_time'] = $toTimeArray($place['closing_time']);
            }
            $place['id'] = (int) $place['id'];
            return $place;
        };

        // 3. Fetch Liked Places
        $likedStmt = $this->pdo->prepare("
            SELECT p.*, 
                   GROUP_CONCAT(DISTINCT c.category_name SEPARATOR ',') AS categories, 
                   GROUP_CONCAT(DISTINCT c.id SEPARATOR ',') AS category_ids
            FROM user_signals us
            JOIN places p ON us.place_id = p.id
            LEFT JOIN tourism_types tt ON p.id = tt.place_id
            LEFT JOIN categories c ON tt.category_id = c.id
            WHERE us.user_id = ? AND us.signal_type = 'like'
            GROUP BY p.id
            ORDER BY us.created_at DESC
        ");
        $likedStmt->execute([$userId]);
        $likedPlaces = array_map($normalizePlace, $likedStmt->fetchAll(PDO::FETCH_ASSOC));

        // 4. Fetch Saved Places
        $savedStmt = $this->pdo->prepare("
            SELECT p.*, 
                   GROUP_CONCAT(DISTINCT c.category_name SEPARATOR ',') AS categories, 
                   GROUP_CONCAT(DISTINCT c.id SEPARATOR ',') AS category_ids
            FROM user_signals us
            JOIN places p ON us.place_id = p.id
            LEFT JOIN tourism_types tt ON p.id = tt.place_id
            LEFT JOIN categories c ON tt.category_id = c.id
            WHERE us.user_id = ? AND us.signal_type = 'save'
            GROUP BY p.id
            ORDER BY us.created_at DESC
        ");
        $savedStmt->execute([$userId]);
        $savedPlaces = array_map($normalizePlace, $savedStmt->fetchAll(PDO::FETCH_ASSOC));

        return [
            'success' => true,
            'user' => [
                'id' => (int) $user['id'],
                'name' => $user['name'] ?? 'ผู้ใช้งาน',
                'email' => $user['email'] ?? '',
                'onboarded' => (int) ($user['onboarded'] ?? 0),
                'avatar_url' => $user['avatar_url'] ?? $user['picture'] ?? '',
                'interests' => $interests
            ],
            'liked_places' => $likedPlaces,
            'saved_places' => $savedPlaces
        ];
    }

    public function interactions(array $params, array $body): array
    {
        if (empty($_SESSION['user_id'])) {
            return ['success' => true, 'liked' => [], 'saved' => []];
        }

        $userId = (int) $_SESSION['user_id'];

        $likedStmt = $this->pdo->prepare("SELECT place_id FROM user_signals WHERE user_id = ? AND signal_type = 'like'");
        $likedStmt->execute([$userId]);
        $liked = array_map('intval', $likedStmt->fetchAll(PDO::FETCH_COLUMN));

        $savedStmt = $this->pdo->prepare("SELECT place_id FROM user_signals WHERE user_id = ? AND signal_type = 'save'");
        $savedStmt->execute([$userId]);
        $saved = array_map('intval', $savedStmt->fetchAll(PDO::FETCH_COLUMN));

        return [
            'success' => true,
            'liked' => $liked,
            'saved' => $saved
        ];
    }

    public function updateProfile(array $params, array $body): array
    {
        if (empty($_SESSION['user_id'])) {
            http_response_code(401);
            return ['success' => false, 'message' => 'Unauthorized'];
        }

        $userId    = (int) $_SESSION['user_id'];
        $name      = trim($body['name'] ?? '');
        $avatarUrl = trim($body['avatar_url'] ?? $body['avatar'] ?? '');

        if (!$name) {
            http_response_code(400);
            return ['success' => false, 'message' => 'กรุณากรอกชื่อที่ต้องการแก้ไข'];
        }

        if ($avatarUrl !== '') {
            $stmt = $this->pdo->prepare('UPDATE users SET name = ?, avatar_url = ? WHERE id = ?');
            $stmt->execute([$name, $avatarUrl, $userId]);
        } else {
            $stmt = $this->pdo->prepare('UPDATE users SET name = ? WHERE id = ?');
            $stmt->execute([$name, $userId]);
        }

        return [
            'success'    => true,
            'message'    => 'อัปเดตโปรไฟล์เรียบร้อยแล้ว',
            'name'       => $name,
            'avatar_url' => $avatarUrl
        ];
    }
}
