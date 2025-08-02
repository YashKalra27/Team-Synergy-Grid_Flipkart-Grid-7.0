require('dotenv').config();
const { Client } = require('@elastic/elasticsearch');

const elasticClient = new Client({
  node: process.env.ELASTIC_NODE || 'http://127.0.0.1:9200'
});

module.exports = elasticClient;
