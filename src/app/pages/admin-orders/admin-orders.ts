import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { catchError, finalize, map, shareReplay, switchMap, tap } from 'rxjs/operators';

import { Order, OrderService, OrderStatus } from '../../services/order';
import { toBackendImageUrl } from '../../utils/image-url';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-orders.html',
  styleUrls: ['./admin-orders.css']
})
export class AdminOrdersComponent {
  private readonly ordersApi = inject(OrderService);

  private readonly refresh$ = new BehaviorSubject<void>(undefined);
  private readonly filter$ = new BehaviorSubject<'pending' | 'cancel-requests' | 'all'>('pending');

  message = '';
  error = '';
  private readonly updatingIds = new Set<string>();

  private readonly allOrders$: Observable<Order[]> = this.refresh$.pipe(
    tap(() => {
      this.error = '';
    }),
    switchMap(() =>
      this.ordersApi.listOrders().pipe(
        catchError((_err) => {
          this.error = 'Failed to load orders.';
          return of([] as Order[]);
        })
      )
    ),
    shareReplay(1)
  );

  readonly orders$: Observable<Order[]> = combineLatest([this.allOrders$, this.filter$]).pipe(
    map(([orders, filter]) => {
      if (filter === 'pending') return orders.filter((o) => o.status === 'pending');
      if (filter === 'cancel-requests') {
        return orders.filter((o) => o.status === 'pending' && Boolean(o.cancelRequest?.requested));
      }
      return orders;
    })
  );

  readonly pendingCount$: Observable<number> = this.allOrders$.pipe(
    map((orders) => orders.filter((o) => o.status === 'pending').length)
  );

  readonly cancelRequestedCount$: Observable<number> = this.allOrders$.pipe(
    map((orders) => orders.filter((o) => o.status === 'pending' && Boolean(o.cancelRequest?.requested)).length)
  );

  setFilter(filter: 'pending' | 'cancel-requests' | 'all'): void {
    this.filter$.next(filter);
  }

  isUpdating(orderId: string): boolean {
    return this.updatingIds.has(orderId);
  }

  updateStatus(orderId: string, status: OrderStatus): void {
    if (this.isUpdating(orderId)) return;
    this.updatingIds.add(orderId);
    this.error = '';
    this.message = '';

    this.ordersApi
      .updateOrderStatus(orderId, status)
      .pipe(finalize(() => this.updatingIds.delete(orderId)))
      .subscribe({
        next: () => {
          this.message = `Order updated to ${status}.`;
          this.refresh$.next();
        },
        error: (err) => {
          this.error = err?.error?.message || 'Failed to update order status.';
        }
      });
  }

  confirmOrder(orderId: string): void {
    this.updateStatus(orderId, 'completed');
  }

  approveCancel(orderId: string): void {
    if (this.isUpdating(orderId)) return;
    if (!confirm("Approve customer's cancel request? This will cancel the order.")) return;

    this.updatingIds.add(orderId);
    this.error = '';
    this.message = '';

    this.ordersApi
      .approveCancelRequest(orderId)
      .pipe(finalize(() => this.updatingIds.delete(orderId)))
      .subscribe({
        next: () => {
          this.message = 'Cancel request approved.';
          this.refresh$.next();
        },
        error: (err) => {
          this.error = err?.error?.message || 'Failed to approve cancel request.';
        }
      });
  }

  disapproveCancel(orderId: string): void {
    if (this.isUpdating(orderId)) return;
    if (!confirm("Disapprove customer's cancel request?")) return;

    this.updatingIds.add(orderId);
    this.error = '';
    this.message = '';

    this.ordersApi
      .disapproveCancelRequest(orderId)
      .pipe(finalize(() => this.updatingIds.delete(orderId)))
      .subscribe({
        next: () => {
          this.message = 'Cancel request disapproved.';
          this.refresh$.next();
        },
        error: (err) => {
          this.error = err?.error?.message || 'Failed to disapprove cancel request.';
        }
      });
  }

  imgUrl(image?: string): string {
    return toBackendImageUrl(image);
  }

  refresh(): void {
    this.refresh$.next();
  }

  trackById(_index: number, order: Order): string {
    return order._id;
  }
}
