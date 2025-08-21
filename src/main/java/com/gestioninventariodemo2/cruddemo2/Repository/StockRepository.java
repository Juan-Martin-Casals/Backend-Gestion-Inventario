package com.gestioninventariodemo2.cruddemo2.Repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gestioninventariodemo2.cruddemo2.Model.Stock;

public interface StockRepository extends JpaRepository<Stock,Long>{

}
