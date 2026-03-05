import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, Observable, merge, of, timer } from 'rxjs';
import { catchError, finalize, switchMap } from 'rxjs/operators';

import { Order, OrderService } from '../../services/order';
import { toBackendImageUrl } from '../../utils/image-url';

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './my-orders.html',
  styleUrls: ['./my-orders.css']
})
export class MyOrdersComponent {
  private readonly ordersApi = inject(OrderService);

  message = '';
  error = '';
  private readonly requestingCancelIds = new Set<string>();
  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  readonly orders$: Observable<Order[]> = merge(timer(0, 7000), this.refresh$).pipe(
    switchMap(() =>
      this.ordersApi.listMyOrders().pipe(
        catchError((_err) => {
          this.error = 'Failed to load your orders.';
          return of([] as Order[]);
        })
      )
    )
  );

  statusLabel(o: Order): string {
    const status = o.status;
    if (status === 'pending' && o.cancelRequest?.requested) return 'Pending (cancel requested)';
    if (status === 'pending' && o.cancelRequest?.decision === 'disapproved') return 'Pending (cancel disapproved)';
    if (status === 'pending') return 'Pending (wait for admin confirm)';
    if (status === 'completed' || status === 'delivered') return 'Completed';
    if (status === 'confirmed') return 'Confirmed';
    if (status === 'cancelled') return 'Cancelled';
    if (status === 'shipped') return 'Shipped';
    return status;
  }

  imgUrl(image?: string): string {
    return toBackendImageUrl(image);
  }

  isRequestingCancel(orderId: string): boolean {
    return this.requestingCancelIds.has(orderId);
  }

  requestCancel(orderId: string): void {
    if (this.isRequestingCancel(orderId)) return;
    if (!confirm('Request to cancel this order? Admin will review your request.')) return;

    this.requestingCancelIds.add(orderId);
    this.error = '';
    this.message = '';

    this.ordersApi
      .requestCancel(orderId)
      .pipe(finalize(() => this.requestingCancelIds.delete(orderId)))
      .subscribe({
        next: () => {
          this.message = 'Cancel request submitted.';
          this.refresh$.next();
        },
        error: (err) => {
          this.error = err?.error?.message || 'Failed to request cancellation.';
        }
      });
  }

  trackById(_i: number, o: Order): string {
    return o._id;
  }
}
