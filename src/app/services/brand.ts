import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, timer } from 'rxjs';
import { retry } from 'rxjs/operators';

import { apiUrl } from '../utils/api-base';

export interface Brand {
  _id: string;
  name: string;
  logo?: string;
}

@Injectable({ providedIn: 'root' })
export class BrandService {
  private apiUrl = apiUrl('/api/brands');

  constructor(private http: HttpClient) {}

  getBrands(): Observable<Brand[]> {
    return this.http.get<Brand[]>(this.apiUrl).pipe(
      retry({
        count: 5,
        delay: (_err, retryCount) => timer(500 * retryCount)
      })
    );
  }

  createBrand(name: string, logo?: string): Observable<Brand> {
    return this.http.post<Brand>(this.apiUrl, { name, logo: logo || '' });
  }
}
