const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

const checkAndFixDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[checkDatabase]: Connected to MongoDB');

    // Find products with missing or invalid price/numReviews
    const productsWithIssues = await Product.find({
      $or: [
        { price: { $exists: false } },
        { price: null },
        { price: { $lte: 0 } },
        { numReviews: { $exists: false } },
        { numReviews: null }
      ]
    }).limit(10);

    console.log(`[checkDatabase]: Found ${productsWithIssues.length} products with missing/invalid data:`);
    
    productsWithIssues.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name}`);
      console.log(`   Price: ${product.price}`);
      console.log(`   NumReviews: ${product.numReviews}`);
      console.log(`   ---`);
    });

    // Get a sample of valid products to see the data structure
    const validProducts = await Product.find({
      price: { $exists: true, $gt: 0 },
      numReviews: { $exists: true }
    }).limit(5);

    console.log('\n[checkDatabase]: Sample of valid products:');
    validProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name}`);
      console.log(`   Price: ₹${product.price}`);
      console.log(`   NumReviews: ${product.numReviews}`);
      console.log(`   Brand: ${product.brand}`);
      console.log(`   ---`);
    });

    // Fix products with missing numReviews
    const fixResult = await Product.updateMany(
      { numReviews: { $exists: false } },
      { $set: { numReviews: 0 } }
    );
    
    if (fixResult.modifiedCount > 0) {
      console.log(`\n[checkDatabase]: Fixed ${fixResult.modifiedCount} products with missing numReviews`);
    }

    // Count total products
    const totalCount = await Product.countDocuments();
    console.log(`\n[checkDatabase]: Total products in database: ${totalCount}`);

  } catch (error) {
    console.error('[checkDatabase]: Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('[checkDatabase]: MongoDB disconnected');
  }
};

if (require.main === module) {
  checkAndFixDatabase();
}

module.exports = checkAndFixDatabase;
