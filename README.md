# Task Manager — Express + MySQL (Aiven) + Frontend

Express + MySQL (Aiven) + MVC + a plain HTML/CSS/JS frontend. By Kuenzang Lhamo.

```
task-api/
├── .env.example
├── .gitignore
├── package.json
├── server.js
├── test-db.js
├── database/
│   └── schema.sql
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
└── src/
    ├── db.js
    ├── routes/
    │   └── taskRoutes.js
    ├── controllers/
    │   └── taskController.js
    └── models/
        └── taskModel.js
```

## Setup

1. Create a MySQL service on Aiven (Overview → Connection information has the host, port, user and password).
2. Copy `.env.example` to `.env` and put **your** host, port, username and password.
3. In MySQL Workbench (host/port from `.env`, SSL: Require), run `database/schema.sql`.
4. Install and start:

```bash
cd task-api
npm install
npm run test:db
npm run dev
```

Open http://localhost:3000 for the frontend, or http://localhost:3000/api for the API check.

## Endpoints

| Method | URL | Body | Status |
|--------|-----|------|--------|
| GET | `/api` | | 200 |
| GET | `/tasks` | | 200 |
| POST | `/tasks` | `{ "title": "Learn Express" }` | 201 / 400 |
| GET | `/tasks/:id` | | 200 / 400 / 404 |
| PUT | `/tasks/:id` | `{ "title": "...", "completed": true }` | 200 / 400 / 404 |
| PATCH | `/tasks/:id` | `{ "completed": true }` | 200 / 400 / 404 |
| DELETE | `/tasks/:id` | | 204 / 400 / 404 |

## Frontend

| Action | Request |
|--------|---------|
| Load tasks (and refresh every 10 s) | GET `/tasks` |
| Add a task | POST `/tasks` |
| Tick / untick | PATCH `/tasks/:id` |
| Edit a title | PUT `/tasks/:id` |
| Delete a task | DELETE `/tasks/:id` |

Filters (All / Pending / Done) and search work in the browser.

## Control from MySQL Workbench

```sql
SELECT * FROM tasks;
INSERT INTO tasks (title) VALUES ('Added from Workbench');
UPDATE tasks SET completed = TRUE WHERE id = 1;
DELETE FROM tasks WHERE id = 7;
```
