# Smart Car Rental

A single-business vehicle rental management app built with React, Vite, Express, MongoDB, and Mongoose. Customers can browse vehicles and request bookings. Staff and Admin manage bookings and rental operations; Admin also manages Staff accounts, fleet categories, and business settings.

## What is implemented

- Customer registration and login. Public signup always creates a Customer account.
- Vehicle and category browsing, search/filtering, and date availability checks.
- Booking requests, Staff/Admin approval or rejection, and eligible cancellation.
- Staff/Admin payment receipt recording by cash, UPI, or card reference. This is not an online payment gateway.
- Pickup, return, odometer and condition notes, damage reporting, and maintenance workflows.
- In-app notifications, profile management, Business Settings, and PDF invoice generation.
- Simple Admin dashboard at `/admin/dashboard`, Staff dashboard at `/staff/dashboard`, and Customer dashboard at `/customer/dashboard`.

## Requirements

- Node.js version supported by Vite 7 (the earlier project setup recommends Node.js 20.19+ or 22.12+).
- npm.
- MongoDB. Booking, payment, pickup, return, and maintenance transactions need MongoDB Atlas or a replica-set deployment; a standalone local MongoDB server is not sufficient for those operations.
- Cloudinary credentials for vehicle or business-logo uploads.

## Configure and run locally

Use two terminals from the project folder.

### Backend

```powershell
cd server
npm install
Copy-Item .env.example .env
```

Edit `server/.env`. Set `MONGODB_URI`, `JWT_SECRET` (random and at least 32 characters), and `CLIENT_URL`. Set the `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_MOBILE` values before creating the initial Admin. The seed password must be at least 12 characters. Cloudinary values are needed only for image uploads.

Run the Admin setup once, then start the API:

```powershell
npm run seed:admin
npm run dev
```

The backend defaults to port 5000 and exposes the API below `/api/v1`. It connects to MongoDB before accepting requests. The health check is `http://localhost:5000/api/v1/health`.

### Frontend

```powershell
cd client
npm install
Copy-Item .env.example .env
npm run dev
```

Open the local address printed by Vite (normally `http://localhost:5173`). The frontend API base is controlled by `VITE_API_URL`. During development, if that variable is not set, the client uses `http://localhost:5000/api/v1`.

## Production configuration

- Set backend `NODE_ENV=production`, `PORT`, `MONGODB_URI`, `JWT_SECRET`, and `CLIENT_URL` in the hosting environment. Production startup requires `CLIENT_URL` and a JWT secret of at least 32 characters.
- Build the frontend with `VITE_API_URL` set to the production API URL, including `/api/v1`. If the API is reverse-proxied on the same origin, the production default is `/api/v1`.
- Use HTTPS and keep MongoDB and Cloudinary credentials private. Do not put backend secrets in frontend environment variables or commit populated `.env` files.
- Use a MongoDB deployment that supports transactions.

## Roles and main routes

| Role | Landing route | Main areas |
|---|---|---|
| Admin | `/admin/dashboard` | Dashboard, Staff, Vehicles, Categories, Bookings, Payments, Business Settings |
| Staff | `/staff/dashboard` | Dashboard, Bookings, Payments, Vehicle Pickups/Returns, Maintenance, Notifications, Profile |
| Customer | `/customer/dashboard` | Browse vehicles, own bookings, payments, invoices, profile |

Backend role and ownership checks protect data independently of frontend route guards. Public registration cannot create Staff or Admin users; Admin creates Staff accounts.

## Useful commands

Run these from the named folder:

| Folder | Command | Purpose |
|---|---|---|
| `server/` | `npm run dev` | Start backend with nodemon |
| `server/` | `npm start` | Start backend normally |
| `server/` | `npm run seed:admin` | Create the initial Admin if one does not already exist |
| `client/` | `npm run dev` | Start Vite development server |
| `client/` | `npm run build` | Create production frontend build |
| `client/` | `npm run preview` | Preview the built frontend |

There is no automated test script in the current package manifests. Vehicles and categories are created through the Admin UI; there is no development-user or vehicle seed script.

## API and design documentation

- [API_ROUTES.md](API_ROUTES.md) lists the registered backend endpoints and access rules.
- [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md) describes architecture, workflows, models, and deployment configuration.

- ## 🌐 Live Application

| Service | URL |
|---|---|
| 🚀 Live Website | [Vehicle Rental Platform](https://vehicle-rental-platform-pi.vercel.app/) |
| 🔐 Login | [Login Page](https://vehicle-rental-platform-pi.vercel.app/login) |
| ⚙️ Backend API | [API Server](https://vehicle-rental-platform-v546.onrender.com/) |
| ❤️ Health Check | [API Health](https://vehicle-rental-platform-v546.onrender.com/api/v1/health) |
