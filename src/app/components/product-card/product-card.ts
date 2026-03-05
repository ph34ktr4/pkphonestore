import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { Product } from '../../models/product.model';
import { Cart } from '../../services/cart';
import { toBackendImageUrl } from '../../utils/image-url';
import { ImgRetryDirective } from '../../utils/img-retry.directive';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterLink, ImgRetryDirective],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css',
})
export class ProductCard {
  @Input({ required: true }) product!: Product;

  constructor(private readonly cart: Cart) {}

  get imageSrc(): string {
    return toBackendImageUrl(this.product?.image);
  }

  get brandName(): string {
    const legacy = this.product?.brand;
    if (legacy) return legacy;

    const ref = this.product?.brandId;
    if (!ref) return '';
    return typeof ref === 'string' ? '' : ref.name;
  }

  get descriptionShort(): string {
    const d = (this.product?.description || '').trim();
    if (!d) return '';
    return d.length > 80 ? `${d.slice(0, 80)}…` : d;
  }

  addToCart(): void {
    this.cart.add(this.product, 1);
  }
}
