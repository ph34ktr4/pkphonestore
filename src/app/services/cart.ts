import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';

import { Product } from '../models/product.model';

export interface CartItem {
  product: Product;
  quantity: number;
}

@Injectable({
  providedIn: 'root',
})
export class Cart {

  private readonly storageKey = 'phoneshop_cart_v1';
  private readonly itemsSubject = new BehaviorSubject<CartItem[]>(this.load());

  readonly items$: Observable<CartItem[]> = this.itemsSubject.asObservable();
  readonly count$: Observable<number> = this.items$.pipe(
    map((items) => items.reduce((sum, i) => sum + i.quantity, 0))
  );

  get itemsSnapshot(): CartItem[] {
    return this.itemsSubject.value;
  }

  add(product: Product, quantity = 1): void {
    if (!product?._id) return;
    if (!Number.isFinite(quantity) || quantity <= 0) return;

    const next = [...this.itemsSubject.value];
    const idx = next.findIndex((i) => i.product._id === product._id);

    if (idx >= 0) {
      next[idx] = {
        product: product,
        quantity: next[idx].quantity + quantity,
      };
    } else {
      next.push({ product, quantity });
    }

    this.set(next);
  }

  remove(productId: string): void {
    const next = this.itemsSubject.value.filter((i) => i.product._id !== productId);
    this.set(next);
  }

  setQuantity(productId: string, quantity: number): void {
    if (!Number.isFinite(quantity)) return;

    const next = [...this.itemsSubject.value];
    const idx = next.findIndex((i) => i.product._id === productId);
    if (idx < 0) return;

    if (quantity <= 0) {
      next.splice(idx, 1);
    } else {
      next[idx] = { ...next[idx], quantity };
    }

    this.set(next);
  }

  clear(): void {
    this.set([]);
  }

  private set(items: CartItem[]): void {
    this.itemsSubject.next(items);
    this.persist(items);
  }

  private load(): CartItem[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];

      return parsed
        .map((x: any) => ({
          product: x?.product as Product,
          quantity: Number(x?.quantity ?? 0),
        }))
        .filter((i) => !!i.product?._id && Number.isFinite(i.quantity) && i.quantity > 0);
    } catch {
      return [];
    }
  }

  private persist(items: CartItem[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(items));
    } catch {
      // ignore storage failures
    }
  }
}
