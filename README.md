# EEF Express CMS

A Strapi-based CMS for the EEF Express e-commerce application with custom controllers, services, and endpoints.

## Overview

This project is a headless CMS built with Strapi that provides a robust API for an e-commerce application. It includes custom implementations for products, cart management, checkout process, order management, and delivery services.

## Features

- **Product Management**: Advanced filtering, searching, and pagination
- **Cart Management**: Add, remove, update items, and calculate totals
- **Checkout Process**: Process cart items into orders with various delivery options
- **Order Management**: Create orders, update status, and track history
- **Delivery Services**: Multiple delivery types with different pricing options
- **Pick-Drop Service**: Create and manage delivery requests

## API Documentation

- [Product Endpoints](./products-docs.md): Detailed documentation for all product-related endpoints

## Delivery Options

The system supports multiple delivery types:

- **Express Delivery**: 🚀 Delivered within a few hours. Ideal for urgent items.
- **Same-Day Delivery**: 📦 Order early, receive it the same day. Fast and reliable.
- **Next-Day Delivery**: 📅 Perfect for non-urgent items. Guaranteed delivery by the next day.
- **Scheduled Delivery**: 🕒 Choose your preferred delivery date and time. Flexible and convenient.
- **Standard Delivery**: ⏳ Affordable option for deliveries within 1–3 business days.

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/Kan-j/eef-express.git
   ```

2. Install dependencies:
   ```
   cd eef-express
   npm install
   ```

3. Start the development server:
   ```
   npm run develop
   ```

4. Access the admin panel:
   ```
   http://localhost:1337/admin
   ```

## Project Structure

- `src/api/`: Contains all API resources (controllers, services, routes)
- `src/components/`: Reusable components for content types
- `products-docs.md`: Documentation for product endpoints

## Strapi Commands

### `develop`

Start your Strapi application with autoReload enabled.

```
npm run develop
# or
yarn develop
```

### `start`

Start your Strapi application with autoReload disabled.

```
npm run start
# or
yarn start
```

### `build`

Build your admin panel.

```
npm run build
# or
yarn build
```

## License

This project is licensed under the MIT License.
