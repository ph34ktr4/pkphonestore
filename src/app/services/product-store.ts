import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { catchError, finalize, switchMap, tap } from 'rxjs/operators';

import { Product } from '../models/product.model';
import { ProductService } from './product';

@Injectable({ providedIn: 'root' })
export class ProductStore {
  private readonly cacheKey = 'phoneshop_products_cache_v1';
  private readonly refresh$ = new Subject<void>();

  private consecutiveFailures = 0;
  private retryTimer: any | null = null;

  private readonly productsSubject = new BehaviorSubject<Product[]>(this.loadCache());
  readonly products$ = this.productsSubject.asObservable();

  // Start in loading=true so a hard refresh doesn't immediately render an empty state.
  private readonly loadingSubject = new BehaviorSubject<boolean>(true);
  readonly isLoading$ = this.loadingSubject.asObservable();

  private readonly errorSubject = new BehaviorSubject<string>('');
  readonly error$ = this.errorSubject.asObservable();

  constructor(private readonly productService: ProductService) {
    this.refresh$
      .pipe(
        tap(() => {
          this.loadingSubject.next(true);
          this.errorSubject.next('');
        }),
        switchMap(() =>
          this.productService.getProducts().pipe(
            tap((products) => {
              const next = products ?? [];
              this.productsSubject.next(next);
              this.saveCache(next);

              this.consecutiveFailures = 0;
              if (this.retryTimer) {
                clearTimeout(this.retryTimer);
                this.retryTimer = null;
              }
            }),
            catchError(() => {
              this.errorSubject.next('Failed to load products.');

              // If the backend isn't ready on first run, keep retrying in the background
              // so products/images appear without requiring a manual refresh.
              this.consecutiveFailures += 1;
              if (!this.retryTimer) {
                const delayMs = Math.min(15000, 1000 * this.consecutiveFailures);
                this.retryTimer = setTimeout(() => {
                  this.retryTimer = null;
                  this.refresh();
                }, delayMs);
              }

              // Keep cached/previous products on screen if fetch fails.
              return of([] as Product[]);
            }),
            finalize(() => this.loadingSubject.next(false))
          )
        )
      )
      .subscribe();

    // Initial load
    this.refresh();
  }

  refresh(): void {
    this.refresh$.next();
  }

  private loadCache(): Product[] {
    try {
      const raw = localStorage.getItem(this.cacheKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed as Product[];
    } catch {
      return [];
    }
  }

  private saveCache(products: Product[]): void {
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify(products));
    } catch {
      // ignore storage failures
    }
  }
}
