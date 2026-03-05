import { Routes } from '@angular/router';

import { HomeComponent } from './pages/home/home';
import { ProductsComponent } from './pages/products/products';
import { ProductDetailComponent } from './pages/product-detail/product-detail';
import { CartComponent } from './pages/cart/cart';
import { LoginComponent } from './pages/login/login';
import { RegisterComponent } from './pages/register/register';
import { CheckoutComponent } from './pages/checkout/checkout';
import { AdminComponent } from './pages/admin/admin';
import { AddProductComponent } from './pages/add-product/add-product';
import { EditProductComponent } from './pages/edit-product/edit-product';
import { AdminOrdersComponent } from './pages/admin-orders/admin-orders';
import { MyOrdersComponent } from './pages/my-orders/my-orders';
import { AboutUsComponent } from './pages/about-us/about-us';
import { ContactUsComponent } from './pages/contact-us/contact-us';
import { adminGuard } from './guards/admin.guard';
import { authGuard } from './guards/auth.guard';
import { customerGuard } from './guards/customer.guard';
import { shopperGuard } from './guards/shopper.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'products', component: ProductsComponent },
  { path: 'product/:id', component: ProductDetailComponent },
  { path: 'about', component: AboutUsComponent },
  { path: 'contact', component: ContactUsComponent },
  { path: 'cart', component: CartComponent, canActivate: [shopperGuard] },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'order', component: CheckoutComponent, canActivate: [customerGuard] },
  { path: 'my-orders', component: MyOrdersComponent, canActivate: [customerGuard] },
  { path: 'checkout', redirectTo: 'order', pathMatch: 'full' },
  { path: 'admin', component: AdminComponent, canActivate: [adminGuard] },
  { path: 'admin/add-product', component: AddProductComponent, canActivate: [adminGuard] },
  { path: 'admin/orders', component: AdminOrdersComponent, canActivate: [adminGuard] },
  { path: 'admin/edit-product/:id', component: EditProductComponent, canActivate: [adminGuard] }
];
