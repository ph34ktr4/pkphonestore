import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { RouterLink } from '@angular/router';
import { ImgRetryDirective } from '../../utils/img-retry.directive';
import { catchError, distinctUntilChanged, finalize, map, of, switchMap, tap, timeout } from 'rxjs';
import { ProductService } from '../../services/product';
import { Product } from '../../models/product.model';
import { Cart } from '../../services/cart';
import { ProductStore } from '../../services/product-store';
import { toBackendImageUrl } from '../../utils/image-url';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ImgRetryDirective],
  templateUrl: './product-detail.html',
  styleUrls: ['./product-detail.css']
})
export class ProductDetailComponent {

  product?: Product;
  error = '';
  isLoading = true;
  isAdding = false;
  qty = 1;
  private allProducts: Product[] = [];
  private currentId: string | null = null;

  get imageSrc(): string {
    const image = this.product?.image || '';
    if (!image) return '';
    return toBackendImageUrl(image);
  }

  get brandName(): string {
    const legacy = this.product?.brand;
    if (legacy) return legacy;

    const ref = this.product?.brandId;
    if (!ref) return '';
    return typeof ref === 'string' ? '' : ref.name;
  }

  get categoryName(): string {
    const ref = this.product?.categoryId;
    if (!ref) return '';
    return typeof ref === 'string' ? ref : ref.name;
  }

  get hasDiscount(): boolean {
    const p = this.product;
    if (!p) return false;
    return !!(p.discountPrice && p.discountPrice < p.price);
  }

  get displayPrice(): number {
    const p = this.product;
    if (!p) return 0;
    return this.hasDiscount ? (p.discountPrice as number) : (p.price as number);
  }

  get discountPercent(): number {
    const p = this.product;
    if (!p || !this.hasDiscount) return 0;
    const was = Number(p.price || 0);
    const now = Number(p.discountPrice || 0);
    if (!was || was <= 0) return 0;
    return Math.max(1, Math.min(99, Math.round(((was - now) / was) * 100)));
  }

  get isOutOfStock(): boolean {
    const stock = this.product?.stock;
    if (stock === undefined || stock === null) return false;
    return Number(stock) <= 0;
  }

  get maxQty(): number | null {
    const stock = this.product?.stock;
    if (stock === undefined || stock === null) return null;
    return Math.max(0, Number(stock));
  }

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private readonly cart: Cart,
    private readonly productStore: ProductStore
  ) {
    // Keep a local copy of products so we can instantly show details after navigating from lists.
    this.productStore.products$.subscribe((products) => {
      this.allProducts = products ?? [];
      if (this.currentId && !this.product) {
        const cached = this.allProducts.find((p) => p._id === this.currentId);
        if (cached) this.product = cached;
      }
    });

    this.route.paramMap
      .pipe(
        tap(() => {
          this.error = '';
          this.isLoading = true;
        }),
        map((params) => params.get('id')),
        distinctUntilChanged(),
        tap((id) => {
          this.currentId = id;
          if (!id) {
            this.error = 'Missing product id.';
            this.product = undefined;
            return;
          }

          const cached = this.allProducts.find((p) => p._id === id);
          if (cached) {
            this.product = cached;
          }
        }),
        switchMap((id) => {
          if (!id) return of(null);

          // Fetch fresh details, but don't show a loading UI.
          return this.productService.getProductById(id).pipe(
            timeout({ first: 8000 }),
            catchError(() => {
              this.error = 'Failed to load product. Please try again.';
              return of(null);
            }),
            finalize(() => {
              this.isLoading = false;
            })
          );
        })
      )
      .subscribe((product) => {
        if (product) {
          this.product = product;
          this.qty = 1;
        }
      });
  }

  addToCart(): void {
    if (!this.product) return;
    if (this.isOutOfStock) return;

    const max = this.maxQty;
    const qty = Math.max(1, Math.floor(Number(this.qty) || 1));
    const safeQty = max === null ? qty : Math.min(qty, max);

    this.isAdding = true;
    this.cart.add(this.product, safeQty);
    setTimeout(() => {
      this.isAdding = false;
    }, 300);
  }

  incQty(): void {
    const next = (Math.floor(Number(this.qty) || 1) + 1);
    const max = this.maxQty;
    this.qty = max === null ? Math.min(next, 99) : Math.min(next, Math.max(1, max));
  }

  decQty(): void {
    const next = (Math.floor(Number(this.qty) || 1) - 1);
    this.qty = Math.max(1, next);
  }


  private clampQty(value: number): number {
    const v = Math.floor(Number(value) || 1);
    const max = this.maxQty;
    return max === null ? Math.min(Math.max(1, v), 99) : Math.min(Math.max(1, v), Math.max(1, max));
  }

  onQtyInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.qty = this.clampQty(Number(input.value));
  }

  onQtyBlur(event: Event): void {
    const input = event.target as HTMLInputElement;
    const clamped = this.clampQty(Number(input.value));
    this.qty = clamped;
    input.value = String(clamped);
  }
}
