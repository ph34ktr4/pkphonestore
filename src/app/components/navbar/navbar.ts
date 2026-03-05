import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable, of, timer } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { Auth } from '../../services/auth';
import { Cart } from '../../services/cart';
import { Brand, BrandService } from '../../services/brand';
import { OrderService } from '../../services/order';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar implements OnInit {
  searchTerm = '';
  selectedBrandId = '';
  brands: Brand[] = [];

  brandsMenuOpen = false;

  @ViewChild('brandDrop', { read: ElementRef })
  brandDrop?: ElementRef<HTMLElement>;

  readonly cartCount$;

  pendingOrdersCount$: Observable<number> = of(0);

  constructor(
    readonly auth: Auth,
    private readonly cart: Cart,
    private readonly brandService: BrandService,
    private readonly orders: OrderService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {
    this.cartCount$ = this.cart.count$;
  }

  ngOnInit(): void {
    if (this.auth.isAdmin()) {
      this.pendingOrdersCount$ = timer(0, 10000).pipe(
        switchMap(() =>
          this.orders.listOrders().pipe(
            map((orders) => (orders || []).filter((o) => o.status === 'pending').length),
            catchError(() => of(0))
          )
        )
      );
    }

    this.brandService.getBrands().subscribe({
      next: (brands) => (this.brands = brands || []),
      error: () => (this.brands = [])
    });

    this.route.queryParamMap.subscribe((params) => {
      this.searchTerm = params.get('q') || '';

			const brandId = params.get('brandId');
			const brandKey = params.get('brandKey');
			if (brandId) this.selectedBrandId = brandId;
			else if (brandKey && brandKey.startsWith('id:')) this.selectedBrandId = brandKey.slice(3);
			else this.selectedBrandId = '';
    });
  }

  onSearch(): void {
    const q = (this.searchTerm || '').trim();
		const queryParams: any = q ? { q } : {};
		if (this.selectedBrandId) queryParams.brandId = this.selectedBrandId;
    this.router.navigate(['/products'], { queryParams });
  }

  toggleBrandsMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.brandsMenuOpen = !this.brandsMenuOpen;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;
    const host = this.brandDrop?.nativeElement;
    if (!host || !target) {
      this.brandsMenuOpen = false;
      return;
    }
    if (!host.contains(target)) this.brandsMenuOpen = false;
  }

	goToBrand(brandId?: string): void {
		const q = (this.searchTerm || '').trim();
		const queryParams: any = {};
		if (q) queryParams.q = q;
		if (brandId) queryParams.brandId = brandId;
    this.brandsMenuOpen = false;
		this.router.navigate(['/products'], { queryParams });
	}

  logout(): void {
    // Clear client state on logout
    this.cart.clear();
    this.auth.logout();
    this.brandsMenuOpen = false;
    this.router.navigate(['/']);
  }
}
