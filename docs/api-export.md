# API Export Documentation

This document explains how to export your API documentation for use in Postman or other API testing tools.

## Available Export Options

### 1. OpenAPI/Swagger JSON Export

Export your API as OpenAPI 3.0 JSON specification:

```bash
yarn export-swagger
```

This will generate a `swagger-docs.json` file that can be imported into:

- Postman
- Insomnia
- Any OpenAPI-compatible tool

### 2. Postman Collection Export

Export your API as a ready-to-use Postman collection:

```bash
yarn export-postman
```

This will generate an `ai-professor-api.postman_collection.json` file that can be directly imported into Postman.

## Importing into Postman

### Method 1: Import OpenAPI JSON

1. Open Postman
2. Click "Import" button
3. Select the `swagger-docs.json` file
4. Postman will automatically create a collection with all your APIs

### Method 2: Import Postman Collection

1. Open Postman
2. Click "Import" button
3. Select the `ai-professor-api.postman_collection.json` file
4. The collection will be imported with proper structure and variables

## Collection Variables

The exported Postman collection includes these variables:

- `{{baseUrl}}`: Your API base URL (default: http://localhost:5000)
- `{{token}}`: JWT authentication token

### Setting up Authentication

1. After importing, go to the collection settings
2. Navigate to the "Variables" tab
3. Update the `token` variable with your JWT token
4. Update the `baseUrl` variable if needed

## API Endpoints Included

The exported collection includes all your API endpoints organized by tags:

### Authentication

- `POST /api/auth/super-admin/login`
- `POST /api/auth/school-admin/login`
- `POST /api/auth/student/login`
- `GET /api/auth/me`

### Module Management

- `POST /api/modules` - Create module
- `GET /api/modules` - Get all modules
- `GET /api/modules/:id` - Get module by ID
- `PATCH /api/modules/:id` - Update module
- `DELETE /api/modules/:id` - Delete module
- `POST /api/modules/toggle-visibility` - Publish/unpublish module

### Chapter Management

- `POST /api/chapters` - Create chapter
- `GET /api/chapters` - Get all chapters
- `GET /api/chapters/:id` - Get chapter by ID
- `PATCH /api/chapters/:id` - Update chapter
- `DELETE /api/chapters/:id` - Delete chapter
- `POST /api/chapters/reorder` - Reorder chapters

### User Management

- `POST /api/professor` - Create professor
- `PATCH /api/professor/:id` - Update professor
- `POST /api/students` - Create student
- `PATCH /api/students/:id` - Update student

### File Upload

- `POST /api/upload/profile-url` - Get upload URL
- `POST /api/upload/bibliography-url` - Get bibliography upload URL
- `POST /api/upload/thumbnail-url` - Get thumbnail upload URL

### Health Check

- `GET /api/health` - API health status

## Live Documentation

You can also access the live Swagger UI documentation at:

```
http://localhost:5000/api/docs
```

This provides an interactive interface to test your APIs directly in the browser.

## Troubleshooting

### Common Issues

1. **Script fails to run**
   - Make sure you have all dependencies installed: `yarn install`
   - Ensure TypeScript is properly configured

2. **Import fails in Postman**
   - Check that the JSON file is valid
   - Try the alternative export method

3. **Authentication not working**
   - Verify the JWT token is valid
   - Check that the token variable is set correctly in Postman

### Getting a JWT Token

To get a JWT token for testing:

1. Use the login endpoint:

   ```
   POST /api/auth/super-admin/login
   {
     "email": "superadmin.aiprofessor@yopmail.com",
     "password": "SuperAdmin@123"
   }
   ```

2. Copy the `access_token` from the response
3. Set it as the `{{token}}` variable in Postman

## Customization

### Modifying Export Scripts

The export scripts are located in the `scripts/` directory:

- `scripts/export-swagger.ts` - OpenAPI JSON export
- `scripts/export-postman.ts` - Postman collection export

You can modify these scripts to:

- Change the base URL
- Add custom headers
- Modify the collection structure
- Add environment-specific configurations

### Adding Custom Headers

To add custom headers to all requests, modify the `convertSwaggerToPostman` function in `scripts/export-postman.ts`:

```typescript
// Add custom headers
requestItem.request!.header.push({
  key: 'X-Custom-Header',
  value: 'custom-value',
  description: 'Custom header for all requests',
});
```

## Environment Setup

For different environments, you can create multiple collections or use Postman environments:

### Development

- Base URL: `http://localhost:5000`
- Database: Local MongoDB

### Staging

- Base URL: `https://staging-api.aiprofessor.com`
- Database: Staging MongoDB

### Production

- Base URL: `https://api.aiprofessor.com`
- Database: Production MongoDB

## Best Practices

1. **Keep tokens secure**: Don't commit tokens to version control
2. **Use environments**: Create separate Postman environments for different stages
3. **Document changes**: Update the collection when APIs change
4. **Test regularly**: Use the collection for automated testing
5. **Version control**: Keep the exported files in version control for team sharing
