Task Manager

SYD204 practical by Kuenzang Lhamo

This is a to-do list website. You can add tasks, tick them off when they're done,
rename them, and delete them. Every task is saved in a real database on the internet,
so nothing is lost when you close the page or restart the computer.

This README explains what the project does, how each part works, and
how to run it yourself, in plain language.



The big idea: a restaurant

The easiest way to understand this project is to think of a restaurant.

| Restaurant | This project | What it does |
|---|---|---|
| Dining room, what guests see | Frontend (`public/` folder) | The web page you click on |
| Waiter, takes orders to the kitchen | API (Express server) | Carries requests between the page and the database |
| Menu, the list of things you can order | Endpoints (`/tasks`, etc.) | The list of things the page is allowed to ask for |
| Storeroom, where food is kept | Database (MySQL on Aiven) | Where the tasks are stored permanently |

A guest never walks into the storeroom. They ask the waiter. In the same way,
the web page never talks to the database directly. It always asks the API.
This keeps the database password secret and the data safe.



What happens when you click "Add task"

Follow one task from your keyboard to the database and back:

```
 1. You type "Study for exam" and click Add task
        │
        ▼
 2. app.js (in the browser) sends:  POST /tasks  { "title": "Study for exam" }
        │
        ▼
 3. server.js receives it and passes it to the task routes
        │
        ▼
 4. taskRoutes.js says: "POST /tasks? That's createTask's job"
        │
        ▼
 5. taskController.js checks: is the title missing? too long?   ── if bad → sends back 400 ❌
        │
        ▼
 6. taskModel.js runs SQL:  INSERT INTO tasks (title) VALUES (?)
        │
        ▼
 7. MySQL on Aiven saves it and gives it a number (id), for example 12
        │
        ▼
 8. The answer travels back up the same path: "201 Created, here's task #12"
        │
        ▼
 9. app.js adds the new task to the top of the list on the page ✅
```

All of this takes less than a second.



The tools used

| Tool | What it is, simply |
|---|---|
| HTML | The skeleton of the page: boxes, buttons, text |
| CSS | The clothes: colours, sizes, layout |
| JavaScript | The brain: makes buttons actually do things |
| Node.js | Lets JavaScript run on a computer, not just inside a browser |
| Express | A Node.js toolkit that makes building a server easy |
| MySQL | A database: think of a very organised spreadsheet |
| Aiven | A company that hosts our MySQL database on the internet |
| MySQL Workbench | An app for looking inside the database and changing it by hand |
| Git / GitHub | Saves every version of the code, like "save points" in a game |



What every file does

```
task-api/
├── server.js              ← the "front door" that starts everything
├── test-db.js             ← a quick check that the database connection works
├── package.json           ← the project's ID card: name, commands, packages
├── .env                   ← SECRET passwords (never uploaded to GitHub)
├── .env.example           ← a blank copy of .env, so others know what to fill in
├── .gitignore             ← a list of files Git must never upload
│
├── database/
│   └── schema.sql         ← instructions to build the tasks table
│
├── public/                ←  THE FRONTEND (what you see)
│   ├── index.html         ← the page structure
│   ├── style.css          ← the look
│   └── app.js             ← the behaviour: talks to the API
│
└── src/                   ←  THE BACKEND (the server side)
    ├── db.js              ← opens the connection to MySQL
    ├── routes/
    │   └── taskRoutes.js       ← "which URL goes to which function"
    ├── controllers/
    │   └── taskController.js   ← "is this request OK? what do we reply?"
    └── models/
        └── taskModel.js        ← "the only file that speaks SQL"
```

Why split the backend into routes, controllers and models?

This is called MVC (Model, View, Controller). Each file has one job, like
workers in a kitchen:

- Routes are the receptionist: they only decide who handles each request.
- Controller is the manager: it checks the order makes sense and decides the reply.
- Model is the storekeeper: the only one allowed into the storeroom (database).
- View is the dining room: the web page.

If something breaks, you know exactly where to look. SQL problem? Check the model.
Wrong status code? Check the controller.



The database table

All tasks live in one table called `tasks`. It looks like a spreadsheet:

| id | title | completed | created_at | updated_at |
|---|---|---|---|---|
| 1 | Set up the Node.js project | 0 | 2026-10-26 09:00 | 2026-10-26 09:00 |
| 2 | Install Express and mysql2 | 1 | 2026-10-26 09:05 | 2026-10-26 10:30 |

| Column | Meaning |
|---|---|
| `id` | A unique number. MySQL picks it automatically (1, 2, 3…), so no two tasks share one |
| `title` | The task's text, up to 255 characters, and it can't be empty |
| `completed` | `0` = not done, `1` = done (that's how MySQL stores true/false) |
| `created_at` | When the task was made, filled in automatically |
| `updated_at` | When the task was last changed, updated automatically |



The API "menu" (endpoints)

These are all the requests the API understands. Each one has a method
(what kind of action) and a URL (what it acts on).

| Action | Method | URL | What you send | What you get back |
|---|---|---|---|---|
| Check the server is alive | GET | `/api` | nothing | a welcome message |
| See all tasks | GET | `/tasks` | nothing | a list of every task |
| See one task | GET | `/tasks/5` | nothing | task number 5 |
| Add a task | POST | `/tasks` | `{ "title": "Buy milk" }` | the new task |
| Replace a task completely | PUT | `/tasks/5` | `{ "title": "Buy bread", "completed": true }` | the updated task |
| Change part of a task | PATCH | `/tasks/5` | `{ "completed": true }` | the updated task |
| Delete a task | DELETE | `/tasks/5` | nothing | nothing (empty means success) |

The four methods, simply

| Method | Think of it as |
|---|---|
| GET | "Show me" (only reads, never changes anything) |
| POST |  "Make a new one" |
| PUT |  "Replace the whole thing" (you must send *every* field) |
| PATCH |  "Change just this bit" (send only the fields you want to change) |
| DELETE |  "Remove it" |

PUT vs PATCH example:** your task is `{ title: "Buy milk", completed: false }`.

- `PATCH { "completed": true }` → only `completed` changes. The title stays "Buy milk".
- `PUT { "completed": true }` → rejected, because PUT needs the title too.

Status codes: the API's "mood"

Every reply comes with a 3-digit number that says how it went:

| Code | Meaning | When you'll see it |
|---|---|---|
| 200 OK | It worked | getting or updating tasks |
| 201 Created | Something new was made | adding a task |
| 204 No Content |  It worked, nothing to show | deleting a task |
| 400 Bad Request |  You sent something wrong | empty title, title too long, id is "abc" |
| 404 Not Found |  That doesn't exist | asking for task 999 when there isn't one |
| 500 Server Error |  The server had a problem | the database is offline |

Easy rule: 2xx = success, 4xx = the user's mistake, 5xx = the server's mistake.



What you can do on the web page

- Add a task: type it and press Enter or click Add task
- Tick a task to mark it done (it gets crossed out)
- Edit a title: click Edit, type, then Enter to save or Esc to cancel
- Delete a task (it asks "are you sure?" first)
- Search by typing in the search box
- Filter with All / Pending / Done
- See counts of total, pending and done tasks
- A badge shows Connected (green) or API offline (red)
- The page refreshes itself every 10 seconds



Controlling the tasks from MySQL Workbench

You can also change tasks directly in the database, without using the website.
Open MySQL Workbench, connect to Aiven, and try these:

```sql
-- See every task
SELECT * FROM tasks;

-- Add a task
INSERT INTO tasks (title) VALUES ('Added from Workbench');

-- Mark task 1 as done
UPDATE tasks SET completed = TRUE WHERE id = 1;

-- Delete task 7
DELETE FROM tasks WHERE id = 7;
```

Keep the web page open while you do this. Within 10 seconds the page shows the change,
without you touching it.

How? The website and Workbench both look at the same database. Every 10 seconds
the page asks the API "what are the tasks now?", and the API reads the latest rows from MySQL.
This repeated asking is called polling.

---

How the project stays safe

1. The password is hidden
The database password is in a file called `.env`. The `.gitignore` file tells Git
never to upload `.env`, so the password is never on GitHub where strangers could read it.
`.env.example` is uploaded instead, with blanks where the secrets go.

2. Protection from SQL injection
A sneaky user could type a "task" like this:

```
'; DROP TABLE tasks; --
```

If the code glued that text straight into the SQL, the database might read it as an order
to delete the whole table. To stop that, every query uses `?` placeholders:

```js
pool.query('INSERT INTO tasks (title) VALUES (?)', [title]);
```

The `?` tells MySQL: "whatever goes here is just text, never a command."
So that sneaky title is saved as a normal (strange) task, and nothing breaks.

3. Protection from XSS (sneaky code on the page)
Someone could add a task titled `<script>alert('hacked')</script>`.
The page shows titles using `textContent`, which displays them as plain letters.
The browser never runs them as code.

4. Checking input
The controller checks everything before it reaches the database:
the title must be text, not empty, and at most 255 characters;
`completed` must be `true` or `false`; and the id must be a positive whole number.
Bad input gets a polite **400** error instead of crashing the server.

5. Encrypted connection
The connection to Aiven uses SSL, so data travelling over the internet is scrambled
and can't be read by anyone in between.



How to run it yourself

What you need first
- Node.js (version 18 or newer). Check by typing `node --version` in a terminal.
- VS Code
- MySQL Workbench
- A free Aiven account with a MySQL service

Step 1: Download the packages
Open the project folder in VS Code, open a terminal, and type:

```bash
npm install
```

This downloads Express and the other tools into a `node_modules` folder.

Step 2: Add your secret settings
1. Copy `.env.example` and name the copy `.env`.
2. Fill it in with your Aiven details. You'll find them on the Aiven
   Overview → Connection information page:

```
PORT=3000
DB_HOST=your-service-name.aivencloud.com
DB_PORT=12345
DB_NAME=defaultdb
DB_SSL=REQUIRED
DB_USER=avnadmin
DB_PASS=your-password
```

3. Save the file (Ctrl+S).

Step 3: Test the connection

```bash
npm run test:db
```

You should see `Connected to MySQL`.

Step 4: Build the table
1. Open MySQL Workbench and make a new connection using your Aiven host, port, user and password.
2. In the SSL tab, set Use SSL to Require.
3. Open `database/schema.sql` and click the ⚡ button.
4. You'll see 6 sample tasks.

Step 5: Start the app

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

(`npm run dev` restarts the server automatically whenever you save a file.
Use `npm start` to run it without auto-restart.)



Common problems and fixes

| Problem | What it means | Fix |
|---|---|---|
| `Could not read package.json` | The terminal is in the wrong folder | `cd` into the folder that contains `package.json` |
| `ENOTFOUND ...aivencloud.com` | The computer can't find the database's address | Check the Aiven service says Running and the host is copied exactly |
| `Access denied` | Wrong username or password | Copy them again from Aiven into `.env`, then save |
| `Table 'defaultdb.tasks' doesn't exist` | The table was never created | Run `database/schema.sql` in Workbench |
| Red API offline badge | The page can't reach the server or database | Check the terminal for an error message |
| `EADDRINUSE` | Another program is already using port 3000 | Stop the other server with Ctrl+C |
| Connection hangs on college Wi-Fi | The network may block the database port | Try a mobile hotspot |

---

What I learned

- How a frontend, backend and database work together
- Building a REST API with Node.js and Express
- Using HTTP methods (GET, POST, PUT, PATCH, DELETE) and status codes
- Connecting to a cloud MySQL database and writing SQL
- Organising code with MVC
- Keeping an app secure: hidden passwords, SQL injection and XSS protection, input checks
- Using `fetch()` so a web page can talk to a server
- Saving my progress step by step with Git and GitHub