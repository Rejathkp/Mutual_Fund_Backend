# 📈 Bancwise MF Portfolio API

A Node.js + Express + MongoDB backend to manage Mutual Fund portfolios with live NAV updates via [mfapi.in](https://www.mfapi.in/).

---

## 🚀 Features

- User authentication (JWT + bcrypt)
- Portfolio management (add/remove/list funds)
- Fund master data & NAV history
- Cron job for automatic NAV updates
- Role-based authorization (admin/user)
- Rate limiting & security middleware

---

## 🛠️ Setup Instructions

### 1. Clone the repo

```bash
git clone https://github.com/your-username/bancwise.git
cd bancwise/server

2. Install dependencies
npm install


3. Configure .env
Create a .env file in the root:

PORT=5000
MONGO_URI=mongodb://localhost:27017/bancwise
JWT_SECRET=supersecret
JWT_EXPIRES_IN=24h
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
CRON_EXPRESSION=0 0 * * *


4. Run the server

npm run server

Server will run on: http://localhost:5000

Some changes need in package.json file

{
  "name": "server",
  "version": "1.0.0",
  "description": "",
  "main": "server.js",
  "scripts": {
    "server": "nodemon server.js",
    "start": "node server.js"
  },
  "type": "module",
  .......


🔑 Authentication

Signup: POST /api/auth/signup

Login: POST /api/auth/login
Attach JWT in headers:

Authorization: Bearer <token>


.........................................................................

📡 API Endpoints
Auth

POST /api/auth/signup → Register user

POST /api/auth/login → Login user

Portfolio

POST /api/portfolio/add → Add a fund to portfolio

GET /api/portfolio/list → List all holdings

DELETE /api/portfolio/:schemeCode → Remove fund

GET /api/portfolio/value → Portfolio valuation + P/L

GET /api/portfolio/history → Portfolio history

Funds

GET /api/funds?search=bluechip&page=1&limit=20 → Search funds

GET /api/funds/:schemeCode/history → NAV history (last 30 days)

(Optional) GET /api/funds/:schemeCode/nav → Latest NAV

Admin

GET /api/admin/users → List all users (admin only)

Health

GET /api/health → Server uptime check

🧪 Testing

Import the provided Postman Collection and test step-by-step:

Signup → Login → Copy token

Call portfolio APIs with Authorization: Bearer <token>

Try Funds search and NAV history

--------------------------------------------------------------------------------------------

2: Database Schema (MongoDB Collections)
users
{
  "_id": ObjectId,
  "name": String,
  "email": String,
  "passwordHash": String,
  "role": { "type": String, "default": "user" },
  "createdAt": Date,
  "updatedAt": Date
}

funds
{
  "_id": ObjectId,
  "schemeCode": Number,
  "schemeName": String,
  "fundHouse": String,
  "schemeType": String,
  "schemeCategory": String,
  "createdAt": Date,
  "updatedAt": Date
}

portfolios
{
  "_id": ObjectId,
  "userId": ObjectId,
  "schemeCode": Number,
  "units": Number,
  "purchaseDate": Date,
  "purchaseNav": Number,
  "investedAmount": Number,
  "createdAt": Date
}

fundLatestNav
{
  "_id": ObjectId,
  "schemeCode": Number,
  "nav": Number,
  "date": String,  // DD-MM-YYYY
  "updatedAt": Date
}

fundNavHistory
{
  "_id": ObjectId,
  "schemeCode": Number,
  "nav": Number,
  "date": String,  // DD-MM-YYYY
  "createdAt": Date
}
```
