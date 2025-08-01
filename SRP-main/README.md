<<<<<<< HEAD
# Flipkart Grid Intelligent Search System

This project is a full-stack intelligent search system built for the Flipkart Grid Challenge. It features a React frontend, a Node.js/Express backend, and an Elasticsearch engine for powerful autosuggestions and search functionality, with MongoDB as the primary database.

## Features

- **Autosuggest Search**: Real-time search suggestions with typo tolerance.
- **Faceted Search**: Filter search results by category, brand, and price.
- **Relevance & Sorting**: Sort results by relevance, price, or customer ratings.
- **Pagination**: Efficiently browse through thousands of products.
- **Responsive UI**: A clean, modern, and mobile-friendly interface inspired by Flipkart's design.

## Tech Stack

- **Frontend**: React.js, React Router, Axios, CSS Modules
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Search**: Elasticsearch
- **Development**: Concurrently, Nodemon

## Prerequisites

Before you begin, ensure you have the following installed and running on your local machine:

- [Node.js and npm](https://nodejs.org/en/)
- [MongoDB](https://www.mongodb.com/try/download/community)
- [Elasticsearch](https://www.elastic.co/downloads/elasticsearch)

## Setup and Installation

Follow these steps to get your development environment set up and running.

### 1. Clone the Repository

```bash
git clone <repository-url>
cd flipkart-grid-search
```

### 2. Backend Setup

Navigate to the backend directory and configure your environment.

```bash
cd backend
```

**a. Create Environment File**

Create a `.env` file in the `backend` directory and add the following configuration. Replace the placeholder values with your actual credentials.

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/flipkart-grid-db

# Your Elasticsearch Credentials
ELASTIC_NODE=https://localhost:9200
ELASTIC_USERNAME=elastic
ELASTIC_PASSWORD=your_elastic_password
```

**b. Install Dependencies**

```bash
npm install
```

**c. Seed the Database**

Run the seeding script to populate your MongoDB database with 1,000 mock products.

```bash
npm run seed
```

**d. Index Data in Elasticsearch**

Run the indexing script to transfer the product data from MongoDB to your Elasticsearch instance.

```bash
npm run index-data
```

**e. Start the Backend Server**

```bash
node index.js
```

Your backend server should now be running on `http://localhost:5000`.

### 3. Frontend Setup

Open a new terminal, navigate to the frontend directory, and install the dependencies.

```bash
cd ../frontend
npm install
```

**Start the Frontend Development Server**

```bash
npm start
```

Your React application should now be running and will automatically open in your browser at `http://localhost:3000`.

## How to Use the Application

1.  **Search**: Start typing in the search bar to see autosuggestions.
2.  **Navigate**: Press Enter or click a suggestion to go to the Search Results Page.
3.  **Filter & Sort**: Use the panel on the left to filter by category or brand. Use the dropdown on the right to sort the results.
4.  **Paginate**: Use the pagination controls at the bottom to navigate through pages of results.
=======
# synergy_kart
>>>>>>> 3f8e60ada05afe079900bcd9fcfb45de280149d6
