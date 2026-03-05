import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { combineLatest } from 'rxjs';

import { Category, CategoryService } from '../../services/category';
import { Brand, BrandService } from '../../services/brand';
import { ProductService } from '../../services/product';
import { Product } from '../../models/product.model';
import { ProductStore } from '../../services/product-store';
import { toBackendImageUrl } from '../../utils/image-url';
import { ImgRetryDirective } from '../../utils/img-retry.directive';

@Component({
  selector: 'app-add-product',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ImgRetryDirective],
  templateUrl: './add-product.html',
  styleUrls: ['./add-product.css']
})
export class AddProductComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly categoryService = inject(CategoryService);
  private readonly brandService = inject(BrandService);
  private readonly productService = inject(ProductService);
  private readonly productStore = inject(ProductStore);
  private readonly router = inject(Router);

  categories: Category[] = [];
  brands: Brand[] = [];
  isLoading = true;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  imageFile: File | null = null;

  products: Product[] = [];
  productsLoading = false;
  productsError = '';

  readonly form = this.fb.group({
    name: ['', [Validators.required]],
    brandId: ['', [Validators.required]],
    price: [0, [Validators.required, Validators.min(0)]],
    stock: [1, [Validators.required, Validators.min(0)]],
    discountPrice: [0, [Validators.min(0)]],
    description: [''],
    categoryId: ['', [Validators.required]]
  });

  ngOnInit(): void {
    combineLatest([
      this.productStore.products$,
      this.productStore.isLoading$,
      this.productStore.error$
    ]).subscribe(([products, loading, err]) => {
      this.products = products ?? [];
      this.productsLoading = loading;
      this.productsError = err || '';
    });

    let catsLoaded = false;
    let brandsLoaded = false;

    const finish = () => {
      if (catsLoaded && brandsLoaded) this.isLoading = false;
    };

    this.categoryService.getCategories().subscribe({
      next: (cats) => {
        this.categories = cats;
        if (!this.form.controls.categoryId.value && cats.length) {
          this.form.controls.categoryId.setValue(cats[0]._id);
        }
        catsLoaded = true;
        finish();
      },
      error: () => {
        this.errorMessage = 'Failed to load categories.';
        this.isLoading = false;
      }
    });

    this.brandService.getBrands().subscribe({
      next: (brands) => {
        this.brands = brands;
        if (!this.form.controls.brandId.value && brands.length) {
          this.form.controls.brandId.setValue(brands[0]._id);
        }
        brandsLoaded = true;
        finish();
      },
      error: () => {
        this.errorMessage = 'Failed to load brands.';
        this.isLoading = false;
      }
    });
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;
    this.imageFile = file;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.imageFile) {
      this.errorMessage = 'Please choose an image file.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const raw = this.form.getRawValue();
    const formData = new FormData();
    formData.append('name', String(raw.name));
    formData.append('brandId', String(raw.brandId));
    formData.append('categoryId', String(raw.categoryId));
    formData.append('price', String(raw.price));
    formData.append('stock', String(raw.stock));

    if (raw.discountPrice !== null && raw.discountPrice !== undefined && String(raw.discountPrice) !== '') {
      formData.append('discountPrice', String(raw.discountPrice));
    }
    if (raw.description) {
      formData.append('description', String(raw.description));
    }
    formData.append('image', this.imageFile);

    this.productService.createProduct(formData).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.successMessage = 'Product added successfully.';
        this.productStore.refresh();
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err?.error?.message || 'Failed to add product. (Admin only)';
      }
    });
  }

  getImageSrc(product: Product): string {
    const image = product.image || '';
    if (!image) return '';
    return toBackendImageUrl(product.image);
  }

  getBrandName(product: Product): string {
    if (product.brand) return product.brand;
    const ref = product.brandId;
    if (!ref) return '';
    return typeof ref === 'string' ? '' : ref.name;
  }

  deleteProduct(product: Product): void {
    if (!product?._id) return;
    const ok = confirm(`Delete product "${product.name}"?`);
    if (!ok) return;

    this.productService.deleteProduct(product._id).subscribe({
      next: () => {
        this.productStore.refresh();
      },
      error: (err) => {
        this.productsError = err?.error?.message || 'Failed to delete product.';
      }
    });
  }
}
