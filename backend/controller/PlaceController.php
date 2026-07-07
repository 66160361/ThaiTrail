<?php

require_once __DIR__.'/../services/PlaceService.php';

class PlaceController
{

    private $service;

    public function __construct($pdo)
    {
        $this->service=new PlaceService($pdo);
    }
    // ดึงข้อมูลสถานที่ทั้งหมด
    public function index()
    {

        header('Content-Type: application/json; charset=utf-8');

        echo json_encode(

            $this->service->getAllPlaces(),

            JSON_UNESCAPED_UNICODE

        );

    }

}