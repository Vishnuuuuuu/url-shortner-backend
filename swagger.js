const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Swagger configuration options
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'URL Shortener API',
      version: '1.0.0',
      description: 'API documentation for URL shortener service',
    },
    servers: [
      {
        url: 'http://localhost:5000', // Update this to your deployed URL in production
        description: 'Local server',
      },
      {
        url: 'https://url-shortner-backend.up.railway.app',
        description: 'Production server',
      },
    ],
  },
  apis: ['./src/routes/*.js']
};

const swaggerDocs = swaggerJSDoc(swaggerOptions);

module.exports = { swaggerUi, swaggerDocs };
