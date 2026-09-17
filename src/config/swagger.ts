import swaggerJSDoc from "swagger-jsdoc";

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Mind Vault API",
      version: "1.0.0",
      description: "API documentation for the Mind Vault platform",
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Development server",
      },
    ],

    // Define tag order here:
    tags: [
      {
        name: "Health",
        description: "API and database health monitoring",
      },
      {
        name: "Auth",
        description: "Authentication and session endpoints",
      },
      {
        name: "Users",
        description: "User management endpoints",
      },
      
      {
        name: "Admin",
        description: "System management and monitoring endpoints",
      },
      {
        name: "Thoughts",
        description: "Thought board and secret edit token endpoints",
      },
      {
        name: "Useful Sites",
        description: "Curated directory and category endpoints",
      },
      {
        name: "Quotes",
        description: "Anonymous and curated quotes management",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./src/routes/*.ts", "./dist/routes/*.js"],
};

export const swaggerSpec = swaggerJSDoc(options);
