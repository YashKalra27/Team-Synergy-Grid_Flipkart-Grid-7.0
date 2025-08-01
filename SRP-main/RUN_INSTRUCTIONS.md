# Complete Setup and Run Instructions

This guide contains all the steps and commands needed to run the Flipkart Grid Search project on your local machine.

---

## Part 0: Prerequisites

Before you start, make sure you have the following software installed and **running** on your computer:

1.  **Node.js & npm**: [Download here](https://nodejs.org/en/)
2.  **MongoDB**: [Download here](https://www.mongodb.com/try/download/community)
3.  **Elasticsearch**: [Download here](https://www.elastic.co/downloads/elasticsearch)

**IMPORTANT**: Make sure both your MongoDB and Elasticsearch services are started and running before proceeding.

---

## Part 1: How to Find/Reset Your Elasticsearch Password

If you don't know the password for the `elastic` user, follow these steps to reset it.

1.  **Open a new Command Prompt or PowerShell terminal.**

2.  **Navigate to your Elasticsearch installation folder.** The path will look something like `C:\elasticsearch-8.x.x`.
    ```powershell
    # IMPORTANT: Replace with the actual path to your Elasticsearch folder
    cd C:\elasticsearch-8.14.1
    ```

3.  **Run the password reset command.**
    ```powershell
    bin\elasticsearch-reset-password.bat -u elastic
    ```

4.  The command will ask `This will reset the password for the [elastic] user. Do you want to continue? [y/N]`. Type `y` and press **Enter**.

5.  A **new password** will be displayed on the screen. **Copy this password immediately** and save it. You will need it in the next section.

---

## Part 2: Backend Setup & Execution

**Open a terminal** for the backend commands.

1.  **Navigate to the backend project directory.**
    ```powershell
    cd c:\Users\TEJASWINI\Downloads\grid\flipkart-grid-search\backend
    ```

2.  **Create and configure the environment file.**
    Create a file named `.env` in the `backend` folder. Paste the following text into it, and **replace `paste_your_new_password_here` with the password you just got from Part 1**.
    ```env
    PORT=5000
    MONGO_URI=mongodb://localhost:27017/flipkart-grid-db
    ELASTIC_NODE=https://localhost:9200
    ELASTIC_USERNAME=elastic
    ELASTIC_PASSWORD=paste_your_new_password_here
    ```

3.  **Install all backend dependencies.**
    ```powershell
    npm install
    ```

4.  **Seed the database with mock product data.**
    ```powershell
    npm run seed
    ```

5.  **Index the data from MongoDB into Elasticsearch.**
    ```powershell
    npm run index-data
    ```

6.  **Start the backend server.**
    ```powershell
    node index.js
    ```
    Your backend is now running. **Keep this terminal open.**

---

## Part 3: Frontend Setup & Execution

**Open a new, separate terminal** for the frontend commands.

1.  **Navigate to the frontend project directory.**
    ```powershell
    cd c:\Users\TEJASWINI\Downloads\grid\flipkart-grid-search\frontend
    ```

2.  **Install all frontend dependencies.**
    ```powershell
    npm install
    ```

3.  **Start the frontend application.**
    ```powershell
    npm start
    ```
    This will automatically open the web application in your browser at `http://localhost:3000`.

Your project is now fully running!
