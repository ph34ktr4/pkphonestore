export interface NamedRef {
  _id: string;
  name: string;
}

export interface Product {
  _id: string;
  name: string;
  price: number;
  stock?: number;
  discountPrice?: number;
  description?: string;
  image?: string;

  // New phoneDB shape
  brandId?: string | NamedRef;
  categoryId?: string | NamedRef;

  // Backward-compat (older payloads)
  brand?: string;
  category?: string;
}
