<?php

require_once __DIR__.'/../models/Place.php';

class PlaceService
{

    private $model;

    public function __construct($pdo)
    {
        $this->model=new Place($pdo);
    }
    
    //ดึงข้อมูลสถานที่ทั้งหมด
    public function getAllPlaces()
    {
        return $this->model->getAll();
    }

}