import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { apiUrl } from '../utils/api-base';

export interface CreateOrderItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  image?: string;
}

export interface CreateOrderPayload {
  customer: {
    fullName: string;
    phone: string;
    address: string;
    note?: string;
  };
  items: CreateOrderItem[];
  payment: {
    cardHolder: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
}

export interface CreateOrderResponse {
  _id: string;
  detailsId: string;
  status: string;
  total: number;
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  image?: string;
}

export type CancelDecision = 'approved' | 'disapproved' | 'auto-cleared';

export interface CancelRequestInfo {
  requested: boolean;
  requestedAt?: string;
  handledAt?: string;
  decision?: CancelDecision;
}

export interface Order {
  _id: string;
  userId: string;
  customer: {
    fullName: string;
    phone: string;
    address: string;
    note?: string;
  };
  items: OrderItem[];
  total: number;
  cancelRequest?: CancelRequestInfo;
  status: string;
  createdAt: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'completed' | 'cancelled';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly apiUrl = apiUrl('/api/orders');

  constructor(private http: HttpClient) {}

  createOrder(payload: CreateOrderPayload): Observable<CreateOrderResponse> {
    return this.http.post<CreateOrderResponse>(this.apiUrl, payload);
  }

  // Admin only
  listOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(this.apiUrl);
  }

  // Customer only
  listMyOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}/my`);
  }

  // Customer only
  removeMyOrder(orderId: string): Observable<{ ok: boolean; _id: string }> {
    return this.http.delete<{ ok: boolean; _id: string }>(`${this.apiUrl}/${orderId}`);
  }

  // Customer only
  requestCancel(orderId: string): Observable<{ ok: boolean; _id: string; cancelRequested: boolean }> {
    return this.http.post<{ ok: boolean; _id: string; cancelRequested: boolean }>(`${this.apiUrl}/${orderId}/cancel-request`, {});
  }

  // Admin only
  updateOrderStatus(orderId: string, status: OrderStatus): Observable<{ ok: boolean; _id: string; status: string }> {
    return this.http.put<{ ok: boolean; _id: string; status: string }>(`${this.apiUrl}/${orderId}/status`, { status });
  }

  // Admin only
  approveCancelRequest(orderId: string): Observable<{ ok: boolean; _id: string; status: string }> {
    return this.http.put<{ ok: boolean; _id: string; status: string }>(`${this.apiUrl}/${orderId}/cancel-request/approve`, {});
  }

  // Admin only
  disapproveCancelRequest(orderId: string): Observable<{ ok: boolean; _id: string; status: string }> {
    return this.http.put<{ ok: boolean; _id: string; status: string }>(`${this.apiUrl}/${orderId}/cancel-request/disapprove`, {});
  }
}
