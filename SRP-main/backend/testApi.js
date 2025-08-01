const http = require('http');

const testAPI = () => {
  console.log('Testing SRP API...');
  
  const req = http.get('http://localhost:5000/api/srp/search?q=shirt', (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        console.log('API Response Status:', res.statusCode);
        console.log('Total products found:', jsonData.total);
        console.log('First 3 products:');
        
        for (let i = 0; i < Math.min(3, jsonData.products.length); i++) {
          const product = jsonData.products[i];
          console.log(`\n${i + 1}. ${product.name}`);
          console.log(`   Price: ₹${product.price} (type: ${typeof product.price})`);
          console.log(`   NumReviews: ${product.numReviews} (type: ${typeof product.numReviews})`);
          console.log(`   Brand: ${product.brand}`);
          console.log(`   Category: ${product.category}`);
        }
      } catch (error) {
        console.error('JSON Parse Error:', error.message);
        console.log('Raw response:', data.substring(0, 500));
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('API Test Error:', error.message);
  });
};

testAPI();
