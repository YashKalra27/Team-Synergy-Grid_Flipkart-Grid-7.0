const fs = require('fs');
const csv = require('csv-parser');
const elasticClient = require('./elasticClient');
require('dotenv').config();

/**
 * Index new dataset into Elasticsearch
 * This script handles the Dataset_Final_TeamSynergyGrid.csv format
 */

const INDEX_NAME = 'products_index';

class ElasticsearchIndexer {
  constructor() {
    this.totalProcessed = 0;
    this.totalIndexed = 0;
    this.errors = 0;
  }

  async deleteExistingIndex() {
    try {
      console.log('✅ Previous index deleted.');
      await elasticClient.indices.delete({ index: INDEX_NAME });
    } catch (error) {
      // Index doesn't exist, which is fine
      console.log('ℹ️  No existing index to delete.');
    }
  }

  async createIndex() {
    try {
      console.log('🔧 Creating new index...');
      
      const indexMapping = {
        mappings: {
          properties: {
            productId: { type: 'keyword' },
            name: { 
              type: 'text',
              analyzer: 'standard',
              fields: {
                keyword: { type: 'keyword' },
                suggest: {
                  type: 'completion',
                  analyzer: 'standard',
                  preserve_separators: true,
                  preserve_position_increments: true,
                  max_input_length: 50
                }
              }
            },
            name_suggest: {
              type: 'completion',
              analyzer: 'standard',
              preserve_separators: true,
              preserve_position_increments: true,
              max_input_length: 50
            },
            description: { 
              type: 'text',
              analyzer: 'standard'
            },
            category: { 
              type: 'keyword',
              fields: {
                text: { type: 'text', analyzer: 'standard' }
              }
            },
            brand: { 
              type: 'keyword',
              fields: {
                text: { type: 'text', analyzer: 'standard' }
              }
            },
            price: { type: 'float' },
            originalPrice: { type: 'float' },
            rating: { type: 'float' },
            popularity: { type: 'integer' },
            numReviews: { type: 'integer' },
            thumbnail: { type: 'keyword' },
            images: { type: 'keyword' },
            productUrl: { type: 'keyword' },
            product_specifications: { type: 'text' },
            category_tree: { type: 'keyword' },
            crawl_timestamp: { type: 'date' },
            is_FK_Advantage_product: { type: 'boolean' }
          }
        },
        settings: {
          analysis: {
            analyzer: {
              autocomplete_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'autocomplete_filter']
              }
            },
            filter: {
              autocomplete_filter: {
                type: 'edge_ngram',
                min_gram: 1,
                max_gram: 20
              }
            }
          }
        }
      };

      await elasticClient.indices.create({
        index: INDEX_NAME,
        body: indexMapping
      });
      
      console.log(`✅ Index '${INDEX_NAME}' created successfully.`);
    } catch (error) {
      console.error('❌ Error creating index:', error);
      throw error;
    }
  }

  processProduct(rawProduct) {
    try {
      // Parse prices
      const retailPrice = parseFloat(rawProduct.retail_price) || 0;
      const discountedPrice = parseFloat(rawProduct.discounted_price) || retailPrice;
      
      // Parse rating
      const rating = rawProduct.product_rating && rawProduct.product_rating !== 'No rating available' 
        ? parseFloat(rawProduct.product_rating) || 0 
        : 0;

      // Parse popularity
      const popularity = parseInt(rawProduct.popularity) || 0;

      // Extract category from category tree
      let categoryTree = [];
      let mainCategory = 'General';
      
      try {
        if (rawProduct.product_category_tree) {
          categoryTree = JSON.parse(rawProduct.product_category_tree);
          if (Array.isArray(categoryTree) && categoryTree.length > 0) {
            const fullPath = categoryTree[0];
            const parts = fullPath.split(' >> ');
            mainCategory = parts[0] || 'General';
          }
        }
      } catch (error) {
        categoryTree = ['General'];
        mainCategory = 'General';
      }

      // Generate images array (using placeholder images)
      const images = [
        "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&h=300&fit=crop&crop=center",
        "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&h=300&fit=crop&crop=center",
        "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&h=300&fit=crop&crop=center",
        "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&h=300&fit=crop&crop=center"
      ];

      // Generate name suggestions for autocomplete
      const nameSuggest = [
        { input: rawProduct.product_name, weight: 20 },
        { input: `${rawProduct.brand} in ${mainCategory}`, weight: 15 },
        { input: rawProduct.brand, weight: 10 },
        { input: `${mainCategory.toLowerCase()} under ${Math.floor(discountedPrice/1000)*1000}`, weight: 5 }
      ];

      // Create the processed product object
      const processedProduct = {
        productId: rawProduct.pid,
        name: rawProduct.product_name,
        name_suggest: nameSuggest,
        description: rawProduct.description || '',
        category: mainCategory,
        brand: rawProduct.brand || 'Unknown',
        price: discountedPrice,
        originalPrice: retailPrice,
        rating: rating,
        popularity: popularity,
        numReviews: Math.floor(popularity / 10) || 0, // Estimate based on popularity
        thumbnail: images[0],
        images: images,
        productUrl: `http://www.flipkart.com/product/${rawProduct.pid}`,
        product_specifications: rawProduct.product_specifications || '{}',
        category_tree: categoryTree,
        crawl_timestamp: new Date().toISOString(),
        is_FK_Advantage_product: false
      };

      return processedProduct;
    } catch (error) {
      console.error('❌ Error processing product:', error);
      this.errors++;
      return null;
    }
  }

  async indexInChunks(products, chunkSize = 100) {
    try {
      const chunks = [];
      for (let i = 0; i < products.length; i += chunkSize) {
        chunks.push(products.slice(i, i + chunkSize));
      }

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const operations = [];
        
        chunk.forEach(product => {
          operations.push({ index: { _index: INDEX_NAME, _id: product.productId } });
          operations.push(product);
        });

        await elasticClient.bulk({ body: operations });
        this.totalIndexed += chunk.length;
        console.log(`✅ Indexed chunk ${i + 1}/${chunks.length} (${this.totalIndexed}/${products.length} products)`);
      }
    } catch (error) {
      console.error('❌ Error indexing chunk:', error);
      throw error;
    }
  }

  async processAndIndex(csvPath) {
    return new Promise((resolve, reject) => {
      const products = [];
      
      console.log(`📂 Reading from: ${csvPath}`);
      
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
          this.totalProcessed++;
          
          if (this.totalProcessed % 5000 === 0) {
            console.log(`📊 Processed ${this.totalProcessed} products...`);
          }
          
          const processedProduct = this.processProduct(row);
          if (processedProduct) {
            products.push(processedProduct);
          }
        })
        .on('end', async () => {
          console.log(`✅ Finished reading CSV: ${products.length} valid products ready for indexing`);
          console.log(`⚠️  Processing errors: ${this.errors}`);
          
          try {
            console.log(`📦 Indexing ${products.length} products in chunks of 100...`);
            await this.indexInChunks(products);
            resolve();
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error) => {
          console.error('❌ Error reading CSV:', error);
          reject(error);
        });
    });
  }

  async getIndexStats() {
    try {
      const stats = await elasticClient.indices.stats({ index: INDEX_NAME });
      return stats.body.indices[INDEX_NAME];
    } catch (error) {
      console.error('❌ Error getting index stats:', error);
      return null;
    }
  }
}

// Main execution
const main = async () => {
  const indexer = new ElasticsearchIndexer();
  
  try {
    console.log('🚀 Starting indexing of new dataset...');
    
    // Delete existing index
    await indexer.deleteExistingIndex();
    
    // Create new index
    await indexer.createIndex();
    
    // Process and index data
    const csvPath = process.argv[2] || '../Dataset_Final_TeamSynergyGrid.csv';
    await indexer.processAndIndex(csvPath);
    
    // Get final stats
    const stats = await indexer.getIndexStats();
    const totalDocs = stats ? stats.total.docs.count : indexer.totalIndexed;
    const successRate = ((indexer.totalIndexed / indexer.totalProcessed) * 100).toFixed(1);
    
    console.log('🎉 Indexing complete!');
    console.log(`📊 Total products in index: ${totalDocs}`);
    console.log(`📊 Success rate: ${successRate}%`);
    
  } catch (error) {
    console.error('❌ Indexing failed:', error);
    process.exit(1);
  } finally {
    console.log('🎉 Indexing completed successfully!');
  }
};

// Run the script
if (require.main === module) {
  main();
}

module.exports = ElasticsearchIndexer; 