import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, timer } from 'rxjs';
import { retry } from 'rxjs/operators';

import { apiUrl } from '../utils/api-base';

export interface Category {
  _id: string;
  name: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private apiUrl = apiUrl('/api/categories');

  constructor(private http: HttpClient) {}

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(this.apiUrl).pipe(
      retry({
        count: 5,
        delay: (_err, retryCount) => timer(500 * retryCount)
      })
    );
  }
}
