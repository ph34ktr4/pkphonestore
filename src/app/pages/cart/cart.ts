import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { Cart } from '../../services/cart';
import { toBackendImageUrl } from '../../utils/image-url';
import { ImgRetryDirective } from '../../utils/img-retry.directive';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterLink, ImgRetryDirective],
  templateUrl: './cart.html',
  styleUrls: ['./cart.css']
})
export class CartComponent {
  readonly items$;
  readonly total$;

  constructor(private readonly cart: Cart) {
    this.items$ = this.cart.items$;
    this.total$ = this.cart.items$.pipe(
      map((items) =>
        items.reduce((sum, i) => {
          const unit = i.product.discountPrice && i.product.discountPrice > 0 ? i.product.discountPrice : i.product.price;
          return sum + unit * i.quantity;
        }, 0)
      )
    );
  }

  addOne(productId: string): void {
    const item = this.cart.itemsSnapshot.find((i) => i.product._id === productId);
    if (!item) return;
    this.cart.add(item.product, 1);
  }

  removeOne(productId: string): void {
    const item = this.cart.itemsSnapshot.find((i) => i.product._id === productId);
    if (!item) return;
    this.cart.setQuantity(productId, item.quantity - 1);
  }

  removeAll(productId: string): void {
    this.cart.remove(productId);
  }

  clear(): void {
    this.cart.clear();
  }

  getImageSrc(image?: string): string {
    return toBackendImageUrl(image);
  }
}
