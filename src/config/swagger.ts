import swaggerJSDoc from "swagger-jsdoc";

const isProduction = process.env.NODE_ENV === "production";
const productionUrl =
  process.env.RENDER_EXTERNAL_URL ||
  "https://mind-vault-backend-qbok.onrender.com";

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
        url: productionUrl,
        description: "Production server",
      },
      ...(isProduction
        ? []
        : [
            {
              url: `http://localhost:${process.env.PORT || 5000}`,
              description: "Development server",
            },
          ]),
    ],
    tags: [
      { name: "Health", description: "API and database health monitoring" },
      { name: "Auth", description: "Authentication and session endpoints" },
      { name: "Users", description: "User management endpoints" },
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
