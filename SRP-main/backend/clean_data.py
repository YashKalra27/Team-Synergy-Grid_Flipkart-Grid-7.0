import pandas as pd
import json
import ast

# Load CSV
df = pd.read_csv("data/flipkart.csv")

# Drop rows with no discounted price
df = df[df["discounted_price"].notnull()]

# Clean and convert overall_rating to float (replace "No rating available" with 0)
def clean_rating(r):
    try:
        return float(r)
    except:
        return 0.0

df["overall_rating"] = df["overall_rating"].apply(clean_rating)

# Parse category from product_category_tree
def extract_main_category(cat_str):
    try:
        parsed = ast.literal_eval(cat_str)  # Convert string to list
        return parsed[0].split(">>")[-1].strip()  # Take last subcategory
    except:
        return "Unknown"

df["product_category"] = df["product_category_tree"].apply(extract_main_category)

# Fill missing brands
df["brand"] = df["brand"].fillna("Unknown")

# Select only the fields we care about
cleaned = df[[
    "product_name",
    "product_category",
    "discounted_price",
    "overall_rating",
    "brand",
    "description",
    "product_url",
    "image"
]].copy()

# Replace NaN descriptions with empty string
cleaned["description"] = cleaned["description"].fillna("")

# Save to JSON
cleaned.to_json("data/processed_products.json", orient="records", indent=2)
print("✅ Data cleaned and saved to data/processed_products.json")
