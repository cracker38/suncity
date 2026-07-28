# SUN CITY NYAKARAMBI Enterprise HMS

Enterprise Hotel Management Website & Reservation System for **SUN CITY NYAKARAMBI Ltd** (Nyakarambi, Kirehe District, Rwanda).

## Stack

- Frontend: React (Vite) — `client/`
- Backend: Node.js + Express — `server/`
- Database: MySQL (XAMPP) — `suncity_hotel`

## Quick start

1. Start **XAMPP MySQL**.
2. Install dependencies from project root:

```bash
npm install
```

3. Import schema + seed data:

```bash
npm run db:import -w server
```

4. Run API + website:

```bash
npm run dev
```

- Website: http://localhost:5173  
- API: http://localhost:5000/api/health  

## Demo logins

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@suncity.rw | Admin@123 |
| Customer | guest@suncity.rw | Guest@123 |
| Reception | reception@suncity.rw | Staff@123 |
| Restaurant | restaurant@suncity.rw | Staff@123 |
| Events | events@suncity.rw | Staff@123 |
| Ops | ops@suncity.rw | Staff@123 |
| Finance | finance@suncity.rw | Staff@123 |

## Company

- Phone: +250780219057 / +250788525507  
- Email: suncitynyakarambi@gmail.com  
- Web: www.suncity.rw  

## Features included

Public luxury website (YouTube hero), AI booking search, rooms, restaurant, events, catering, gallery, offers, blog, contact, full booking engine, mock payment adapters (MoMo/Airtel/Visa/MC/Stripe), PDF invoices, AI assistant, customer portal, and role dashboards (Reception, Restaurant, Events, Ops, Finance, Admin) with reports export.
