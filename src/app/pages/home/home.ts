import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { combineLatest } from 'rxjs';

import { Product } from '../../models/product.model';
import { ProductCard } from '../../components/product-card/product-card';
import { ProductStore } from '../../services/product-store';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ProductCard],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent implements OnInit {
  products: Product[] = [];
  isLoading = false;
  errorMessage = '';

  constructor(private readonly productStore: ProductStore) {}

  ngOnInit(): void {
    combineLatest([
      this.productStore.products$,
      this.productStore.isLoading$,
      this.productStore.error$
    ]).subscribe(([products, loading, err]) => {
      this.products = products ?? [];
      this.isLoading = loading;
      this.errorMessage = err;
    });
  }
}
