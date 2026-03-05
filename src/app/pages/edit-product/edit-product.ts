import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { Brand, BrandService } from '../../services/brand';
import { Category, CategoryService } from '../../services/category';
import { ProductService } from '../../services/product';
import { ProductStore } from '../../services/product-store';
import { Product } from '../../models/product.model';
import { toBackendImageUrl } from '../../utils/image-url';

@Component({
  selector: 'app-edit-product',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-product.html',
  styleUrls: ['./edit-product.css'],
})
export class EditProductComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly categoryService = inject(CategoryService);
  private readonly brandService = inject(BrandService);
  private readonly productService = inject(ProductService);
  private readonly productStore = inject(ProductStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  categories: Category[] = [];
  brands: Brand[] = [];

  productId = '';
  product?: Product;

  isLoading = true;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  imageFile: File | null = null;

  readonly form = this.fb.group({
    name: ['', [Validators.required]],
    brandId: ['', [Validators.required]],
    price: [0, [Validators.required, Validators.min(0)]],
    stock: [1, [Validators.required, Validators.min(0)]],
    discountPrice: [0, [Validators.min(0)]],
    description: [''],
    categoryId: ['', [Validators.required]],
  });

  get imagePreview(): string {
    if (this.imageFile) return URL.createObjectURL(this.imageFile);
    const img = this.product?.image || '';
    if (!img) return '';
    return toBackendImageUrl(img);
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage = 'Missing product id.';
      this.isLoading = false;
      return;
    }
    this.productId = id;

    let catsLoaded = false;
    let brandsLoaded = false;
    let productLoaded = false;

    const finish = () => {
      if (catsLoaded && brandsLoaded && productLoaded) this.isLoading = false;
    };

    this.categoryService.getCategories().subscribe({
      next: (cats) => {
        this.categories = cats;
        catsLoaded = true;
        finish();
      },
      error: () => {
        this.errorMessage = 'Failed to load categories.';
        this.isLoading = false;
      },
    });

    this.brandService.getBrands().subscribe({
      next: (brands) => {
        this.brands = brands;
        brandsLoaded = true;
        finish();
      },
      error: () => {
        this.errorMessage = 'Failed to load brands.';
        this.isLoading = false;
      },
    });

    this.productService.getProductById(id).subscribe({
      next: (p) => {
        this.product = p;
        this.form.patchValue({
          name: p.name || '',
          price: p.price ?? 0,
          stock: p.stock ?? 0,
          discountPrice: p.discountPrice ?? 0,
          description: p.description ?? '',
          brandId: typeof p.brandId === 'string' ? p.brandId : p.brandId?._id || '',
          categoryId: typeof p.categoryId === 'string' ? p.categoryId : p.categoryId?._id || '',
        });
        productLoaded = true;
        finish();
      },
      error: () => {
        this.errorMessage = 'Failed to load product.';
        this.isLoading = false;
      },
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
    if (raw.description !== undefined && raw.description !== null) {
      formData.append('description', String(raw.description));
    }
    if (this.imageFile) {
      formData.append('image', this.imageFile);
    }

    this.productService.updateProduct(this.productId, formData).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.successMessage = 'Product updated successfully.';
        this.productStore.refresh();
        this.router.navigate(['/admin/add-product']);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err?.error?.message || 'Failed to update product. (Admin only)';
      },
    });
  }
}
