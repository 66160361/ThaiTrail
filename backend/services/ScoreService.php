<?php

/**
 * ScoreService — คำนวณและบันทึกคะแนนแนะนำรายผู้ใช้-รายสถานที่ลงตาราง user_place_scores
 *
 * สูตรคะแนนรายสถานที่ (ตรงตามเงื่อนไขที่ต้องการ):
 * Score(u,i) = 5S + 4B + 2L + 1.5 * min(ln(1 + T), ln(1 + 180)) + 1.0 * ln(1 + C) + 2.0 * min(T / E, 1)
 *
 * โดยที่:
 * - S/B/L คือค่าสถานะแบบไบนารีจาก user_interactions.has_shared/has_saved/has_liked
 * - T คือค่า user_interactions.total_dwell_time
 * - C คือค่า user_interactions.click_count
 * - E คือค่า places.expected_read_time (เวลาคาดการณ์ในการอ่าน/ดูเนื้อหาของสถานที่)
 * - 180 คือเพดานเวลา dwell คงที่ (วินาที)
 */
class ScoreService
{
    private PDO $pdo;

    // น้ำหนักของแต่ละพฤติกรรมตามสูตรคะแนนรายสถานที่
    private const W_SHARE = 5.0;
    private const W_SAVE = 4.0;
    private const W_LIKE = 2.0;
    private const W_DWELL = 1.5;
    private const W_CLICK = 1.0;
    private const W_EXPECT = 2.0;
    private const DWELL_CAP_SECONDS = 180;
    private const TIME_DECAY_RATE = 0.05;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * คำนวณและบันทึกคะแนนสำหรับคู่ (ผู้ใช้, สถานที่) เดียว
     * ถูกเรียกทุกครั้งที่มีสัญญาณพฤติกรรม (view/like/save/share/unlike/unsave)
     */
    public function recalcPlace(int $userId, int $placeId): void
    {
        // คำนวณคะแนนตามสูตร Share/Save/Like + Dwell(Log-capped) + Click(Log) + Expected-time completion
        $scoreStmt = $this->pdo->prepare('
            SELECT ROUND(
                (5.0 * COALESCE(ui.has_shared, 0))
                + (4.0 * COALESCE(ui.has_saved, 0))
                + (2.0 * COALESCE(ui.has_liked, 0))
                + (1.5 * LEAST(LN(1 + GREATEST(COALESCE(ui.total_dwell_time, 0), 0)), LN(1 + :dwell_cap)))
                + (1.0 * LN(1 + GREATEST(COALESCE(ui.click_count, 0), 0)))
                + COALESCE((
                    2.0 * LEAST(
                        GREATEST(COALESCE(ui.total_dwell_time, 0), 0)
                        / NULLIF(GREATEST(COALESCE(p.expected_read_time, 0), 0), 0),
                        1
                    )
                ), 0),
                2
            ) AS score
            FROM places p
            LEFT JOIN user_interactions ui ON ui.place_id = p.id
                                          AND ui.user_id = :user_id
            WHERE p.id = :place_id
        ');
        $scoreStmt->execute([
            ':user_id' => $userId,
            ':place_id' => $placeId,
            ':dwell_cap' => self::DWELL_CAP_SECONDS,
        ]);
        $row = $scoreStmt->fetch(PDO::FETCH_ASSOC);
        // ถ้าไม่มีข้อมูล ให้ถือว่าคะแนนเป็น 0
        $score = $row ? (float) $row['score'] : 0.0;

        // บันทึกคะแนนแบบ upsert: มีอยู่แล้วให้อัปเดต, ยังไม่มีก็สร้างใหม่
        $upsert = $this->pdo->prepare('
            INSERT INTO user_place_scores (user_id, place_id, score)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE score = VALUES(score), updated_at = NOW()
        ');
        $upsert->execute([$userId, $placeId, $score]);

        // อัปเดตคะแนนความชอบรายหมวดหมู่แบบ Time Decay หลังคำนวณคะแนนสถานที่
        $this->syncDecayedPreferences($userId);
    }

    /**
     * คำนวณและบันทึกคะแนนทุกสถานที่ของผู้ใช้หนึ่งคน
     * ถูกเรียกเมื่อความสนใจของผู้ใช้เปลี่ยน (Onboarding / setInterests)
     * ใช้คำสั่ง INSERT ... ON DUPLICATE KEY UPDATE แบบ batch เพื่อประสิทธิภาพ
     */
    public function recalcAll(int $userId): void
    {
        // คำนวณคะแนนทุกสถานที่ในครั้งเดียว (batch) ตามสูตรเดียวกับ recalcPlace
        $sql = '
            INSERT INTO user_place_scores (user_id, place_id, score)
            SELECT
                :user_id AS user_id,
                p.id     AS place_id,
                ROUND(
                    (5.0 * COALESCE(ui.has_shared, 0))
                    + (4.0 * COALESCE(ui.has_saved, 0))
                    + (2.0 * COALESCE(ui.has_liked, 0))
                    + (1.5 * LEAST(LN(1 + GREATEST(COALESCE(ui.total_dwell_time, 0), 0)), LN(1 + :dwell_cap)))
                    + (1.0 * LN(1 + GREATEST(COALESCE(ui.click_count, 0), 0)))
                    + COALESCE((
                        2.0 * LEAST(
                            GREATEST(COALESCE(ui.total_dwell_time, 0), 0)
                            / NULLIF(GREATEST(COALESCE(p.expected_read_time, 0), 0), 0),
                            1
                        )
                    ), 0),
                    2
                ) AS score
            FROM places p
            LEFT JOIN user_interactions ui ON ui.place_id = p.id
                                          AND ui.user_id = :user_id2
            ON DUPLICATE KEY UPDATE score = VALUES(score), updated_at = NOW()
        ';

        // ผูกพารามิเตอร์ค่าน้ำหนักและ user สำหรับคำนวณแบบ batch
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':user_id' => $userId,
            ':user_id2' => $userId,
            ':dwell_cap' => self::DWELL_CAP_SECONDS,
        ]);

        // อัปเดตคะแนนความชอบรายหมวดหมู่แบบ Time Decay หลังคำนวณคะแนนทุกสถานที่
        $this->syncDecayedPreferences($userId);
    }

    private function syncDecayedPreferences(int $userId): void
    {
        // หากยังไม่มีตาราง user_preferences ให้ข้ามแบบเงียบๆ เพื่อรองรับสภาพแวดล้อมที่ schema ไม่ตรงกัน
        $tableExistsStmt = $this->pdo->query(
            "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_preferences'"
        );
        $tableExists = (int) $tableExistsStmt->fetchColumn() > 0;
        if (!$tableExists) {
            return;
        }

        // สูตร Time Decay รายหมวดหมู่ (แบบ normalized ตามหมวด):
        // preference_score = (1 / N_c) * SUM(ups.score * EXP(-rate * DATEDIFF(...)))
        // โดย N_c = จำนวนสถานที่ในหมวด c ที่ผู้ใช้มี interaction จริง
        // โดยแมป place -> category ผ่าน tourism_types
        $sql = '
            INSERT INTO user_preferences (
                user_id,
                category_id,
                preference_score,
                interacted_count,
                updated_at
            )
            SELECT
                ups.user_id,
                tt.category_id,
                (
                    SUM(
                        ups.score * EXP(
                            -:decay_rate * GREATEST(
                                DATEDIFF(NOW(), COALESCE(ui.last_action_at, ups.updated_at)),
                                0
                            )
                        )
                    )
                    / GREATEST(
                        COUNT(DISTINCT CASE
                            WHEN ui.has_shared = 1
                              OR ui.has_saved = 1
                              OR ui.has_liked = 1
                              OR COALESCE(ui.total_dwell_time, 0) > 0
                              OR COALESCE(ui.click_count, 0) > 0
                            THEN ups.place_id
                            ELSE NULL
                        END),
                        1
                    )
                ) AS preference_score,
                                COUNT(DISTINCT CASE
                                        WHEN ui.has_shared = 1
                                            OR ui.has_saved = 1
                                            OR ui.has_liked = 1
                                            OR COALESCE(ui.total_dwell_time, 0) > 0
                                            OR COALESCE(ui.click_count, 0) > 0
                                        THEN ups.place_id
                                        ELSE NULL
                                END) AS interacted_count,
                NOW() AS updated_at
            FROM user_place_scores ups
            INNER JOIN tourism_types tt ON tt.place_id = ups.place_id
            LEFT JOIN user_interactions ui
                   ON ui.user_id = ups.user_id
                  AND ui.place_id = ups.place_id
            WHERE ups.user_id = :user_id
              AND tt.category_id IS NOT NULL
            GROUP BY ups.user_id, tt.category_id
            ON DUPLICATE KEY UPDATE
                preference_score = VALUES(preference_score),
                interacted_count = VALUES(interacted_count),
                updated_at = VALUES(updated_at)
        ';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':user_id' => $userId,
            ':decay_rate' => self::TIME_DECAY_RATE,
        ]);
    }
}
