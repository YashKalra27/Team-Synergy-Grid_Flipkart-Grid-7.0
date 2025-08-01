const elasticClient = require('./elasticClient');
require('dotenv').config();

const searchQueriesIndexName = 'search_queries';

const createSearchQueriesIndex = async () => {
  try {
    // Delete existing index if it exists
    const exists = await elasticClient.indices.exists({ index: searchQueriesIndexName });
    if (exists) {
      await elasticClient.indices.delete({ index: searchQueriesIndexName });
      console.log(`✅ Previous index '${searchQueriesIndexName}' deleted.`);
    }

    // Create new index with mapping
    await elasticClient.indices.create({
      index: searchQueriesIndexName,
      body: {
        mappings: {
          properties: {
            query: { type: 'text' },
            suggest: {
              type: 'completion',
              analyzer: 'standard',
              search_analyzer: 'standard'
            },
            frequency: { type: 'integer' },
            lastSearched: { type: 'date' }
          }
        }
      }
    });

    console.log(`✅ Search queries index '${searchQueriesIndexName}' created successfully.`);

    // Add some sample popular queries
    const sampleQueries = [
      'shoes', 'mobile phones', 'laptops', 'headphones', 'watches',
      'bags', 'clothing', 'books', 'toys', 'electronics',
      'nike shoes', 'iphone', 'samsung', 'adidas', 'puma'
    ];

    const body = sampleQueries.flatMap(query => [
      { index: { _index: searchQueriesIndexName } },
      {
        query: query,
        suggest: {
          input: query.split(' '),
          weight: Math.floor(Math.random() * 100) + 1
        },
        frequency: Math.floor(Math.random() * 1000) + 1,
        lastSearched: new Date().toISOString()
      }
    ]);

    await elasticClient.bulk({ refresh: true, body });
    console.log(`✅ Added ${sampleQueries.length} sample queries to the index.`);

  } catch (error) {
    console.error('❌ Error creating search queries index:', error);
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  createSearchQueriesIndex()
    .then(() => {
      console.log('🎉 Search queries index setup completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Search queries index setup failed:', error);
      process.exit(1);
    });
}

module.exports = createSearchQueriesIndex; 