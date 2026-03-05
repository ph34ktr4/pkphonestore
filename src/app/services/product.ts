import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, timer } from 'rxjs';
import { retry } from 'rxjs/operators';
import { Product } from '../models/product.model';
import { apiUrl } from '../utils/api-base';

export interface CreateProductDto {
  name: string;
  brandId: string;
  price: number;
  stock: number;
  discountPrice?: number;
  description?: string;
  categoryId: string; // Category _id
}

@Injectable({ providedIn: 'root' })
export class ProductService {

  private apiUrl = apiUrl('/api/products');

  constructor(private http: HttpClient) {}

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(this.apiUrl).pipe(
      retry({
        count: 5,
        delay: (_err, retryCount) => timer(500 * retryCount)
      })
    );
  }

  getProductById(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`).pipe(
      retry({
        count: 5,
        delay: (_err, retryCount) => timer(500 * retryCount)
      })
    );
  }

  createProduct(dto: CreateProductDto): Observable<Product>;
  createProduct(formData: FormData): Observable<Product>;
  createProduct(payload: CreateProductDto | FormData): Observable<Product> {
    if (payload instanceof FormData) {
      return this.http.post<Product>(this.apiUrl, payload);
    }

    const formData = new FormData();
    formData.append('name', payload.name);
    formData.append('brandId', payload.brandId);
    formData.append('categoryId', payload.categoryId);
    formData.append('price', String(payload.price));
    formData.append('stock', String(payload.stock));
    if (payload.discountPrice !== undefined) formData.append('discountPrice', String(payload.discountPrice));
    if (payload.description) formData.append('description', payload.description);

    return this.http.post<Product>(this.apiUrl, formData);
  }

  updateProduct(id: string, dto: Partial<CreateProductDto>): Observable<Product>;
  updateProduct(id: string, formData: FormData): Observable<Product>;
  updateProduct(id: string, payload: Partial<CreateProductDto> | FormData): Observable<Product> {
    if (payload instanceof FormData) {
      return this.http.put<Product>(`${this.apiUrl}/${id}`, payload);
    }

    const formData = new FormData();
    if (payload.name !== undefined) formData.append('name', String(payload.name));
    if (payload.brandId !== undefined) formData.append('brandId', String(payload.brandId));
    if (payload.categoryId !== undefined) formData.append('categoryId', String(payload.categoryId));
    if (payload.price !== undefined) formData.append('price', String(payload.price));
    if (payload.stock !== undefined) formData.append('stock', String(payload.stock));
    if (payload.discountPrice !== undefined) formData.append('discountPrice', String(payload.discountPrice));
    if (payload.description !== undefined) formData.append('description', String(payload.description ?? ''));

    return this.http.put<Product>(`${this.apiUrl}/${id}`, formData);
  }

  deleteProduct(id: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.apiUrl}/${id}`);
  }
}
