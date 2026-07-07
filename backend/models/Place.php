<?php

class Place
{
    private $pdo;

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
    }

    //  ปรับให้รับค่า $categoryId เข้ามาด้วย (ถ้าไม่ส่งมาให้ค่าเริ่มต้นเป็น null)
    public function getAll($categoryId = null)
    {
        if ($categoryId) {
            //  ถ้าส่งหมวดหมู่มา ให้ดึงเฉพาะสถานที่ที่ผูกกับหมวดหมู่นั้น
            $stmt = $this->pdo->prepare("
                SELECT p.* FROM places p
                INNER JOIN tourism_types tt ON p.id = tt.place_id
                WHERE tt.category_id = :category_id
                ORDER BY p.place_name
            ");
            $stmt->execute([':category_id' => $categoryId]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } else {
            // ถ้าไม่ส่งอะไรมาเลย ห้ดึงสถานที่ทั้งหมดตามเดิม
            $stmt = $this->pdo->query("
                SELECT *
                FROM places
                ORDER BY place_name
            ");
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
    }
}