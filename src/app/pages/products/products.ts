import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Product } from '../../models/product.model';
import { ProductStore } from '../../services/product-store';
import { Brand, BrandService } from '../../services/brand';
import { ProductCard } from '../../components/product-card/product-card';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, RouterModule, ProductCard],
  templateUrl: './products.html',
  styleUrls: ['./products.css']
})
export class ProductsComponent implements OnInit {

  private allProducts: Product[] = [];
  products: Product[] = [];

  brands: Brand[] = [];
  private selectedCategoryId: string | null = null;
  private selectedBrandId: string | null = null;
  private searchQuery = '';

  constructor(
    private route: ActivatedRoute,
    private readonly router: Router,
    private readonly productStore: ProductStore,
    private readonly brandService: BrandService
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.selectedCategoryId = params.get('categoryId');

      const brandId = params.get('brandId');
      const brandKey = params.get('brandKey');
      if (brandId) {
        this.selectedBrandId = brandId;
      } else if (brandKey && brandKey.startsWith('id:')) {
        this.selectedBrandId = brandKey.slice(3);
      } else {
        this.selectedBrandId = null;
      }

      this.searchQuery = (params.get('q') || '').trim().toLowerCase();
      this.applyFilter();
    });

    this.productStore.products$.subscribe((products) => {
      this.allProducts = products;
      this.applyFilter();
    });

    this.brandService.getBrands().subscribe({
      next: (brands) => {
        this.brands = brands || [];
      },
      error: () => {
        this.brands = [];
      }
    });
  }

  private applyFilter(): void {
    const id = this.selectedCategoryId;
    const brandId = this.selectedBrandId;
    const q = this.searchQuery;

    let next = [...this.allProducts];

    if (brandId) {
      next = next.filter((p) => {
        const ref = p.brandId;
        if (!ref) return false;
        if (typeof ref === 'string') return ref === brandId;
        return ref._id === brandId;
      });
    }

    if (id) {
      next = next.filter((p) => {
        const cat = p.categoryId;
        if (!cat) return false;
        if (typeof cat === 'string') return cat === id;
        return cat._id === id;
      });
    }

    if (q) {
      next = next.filter((p) => {
        const name = String(p.name || '').toLowerCase();
        const desc = String(p.description || '').toLowerCase();
        const brand = this.getBrandName(p).toLowerCase();
        return name.includes(q) || desc.includes(q) || brand.includes(q);
      });
    }

    this.products = next;
  }

  get selectedBrand(): string {
    return this.selectedBrandId || '';
  }

  onBrandChange(value: string): void {
    const next = value || null;
    this.selectedBrandId = next;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { brandId: next, brandKey: null },
      queryParamsHandling: 'merge'
    });
  }

  getBrandName(product: Product): string {
    if (product.brand) return product.brand;
    const ref = product.brandId;
    if (!ref) return '';
    return typeof ref === 'string' ? '' : ref.name;
  }
}
