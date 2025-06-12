# Contributing to Enhanced Home Assistant MCP

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## 🚀 Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/enhanced-homeassistant-mcp.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/your-feature-name`

## 🏗️ Development Setup

### Prerequisites
- Node.js 18+
- TypeScript knowledge
- Access to a Home Assistant instance for testing

### Environment Setup
1. Copy `.env.example` to `.env`
2. Configure your Home Assistant URL and token
3. Run `npm run dev` to start development server

## 📝 Code Style

- Use TypeScript with strict mode
- Follow existing code patterns
- Use meaningful variable and function names
- Add JSDoc comments for public functions
- Prefer async/await over promises

### Code Structure
```typescript
// Good
export async function getEntityState(entityId: string): Promise<ApiResponse> {
  try {
    const result = await makeGetRequest(`/api/states/${entityId}`);
    return result;
  } catch (error) {
    return handleApiError(error);
  }
}

// Bad
export function getEntityState(entityId) {
  return makeGetRequest(`/api/states/${entityId}`);
}
```

## 🧪 Testing

### Manual Testing
1. Use the MCP inspector: `npm run inspector`
2. Test with real Home Assistant instance
3. Verify error handling with invalid inputs

### Test Checklist
- [ ] Tool responds correctly with valid inputs
- [ ] Tool handles invalid inputs gracefully
- [ ] Error messages are helpful
- [ ] TypeScript types are correct
- [ ] No console.log statements (use console.error for debugging)

## 🛠️ Adding New Tools

### 1. Choose the Right Category
- `basic.ts` - Core Home Assistant operations
- `automation.ts` - Automations, scenes, scripts
- `history.ts` - Historical data and monitoring
- `devices.ts` - Device-specific controls
- `system.ts` - System administration

### 2. Tool Structure
```typescript
server.tool(
  "tool_name",
  "Clear description of what the tool does",
  {
    // Zod schema for parameters
    entity_id: z.string().describe("Description of parameter")
  },
  async ({ entity_id }) => {
    // Implementation
    const result = await apiCall();
    
    if (!result.success) {
      return formatErrorResponse(`Error message: ${result.message}`);
    }
    
    return formatSuccessResponse("Success message");
  }
);
```

### 3. Parameter Validation
- Use Zod schemas for all parameters
- Provide clear descriptions
- Validate entity IDs start with correct domain when applicable
- Use enums for fixed value sets

### 4. Error Handling
- Always check API response success
- Use `formatErrorResponse` for errors
- Use `formatSuccessResponse` for success
- Provide helpful error messages

### 5. Documentation
- Add tool to README.md table
- Include usage example if complex
- Document all parameters

## 📚 API Guidelines

### Response Formatting
```typescript
// Success
return formatSuccessResponse(
  `Entity ${entity_id} state: ${state}\n` +
  `Last updated: ${last_updated}`
);

// Error
return formatErrorResponse(
  `Failed to get entity state: ${error.message}`
);
```

### Entity ID Validation
```typescript
// Validate domain
if (!entity_id.startsWith('light.')) {
  return formatErrorResponse(
    "Entity ID must be a light (start with 'light.')"
  );
}
```

### Multi-entity Support
```typescript
// Support both single and multiple entities
entity_id: z.union([
  z.string(), 
  z.array(z.string())
]).describe("Entity ID(s)")
```

## 🐛 Bug Reports

When reporting bugs, include:
- Home Assistant version
- MCP server version
- Steps to reproduce
- Expected vs actual behavior
- Error messages or logs
- Environment details (OS, Node.js version)

## ✨ Feature Requests

For new features:
- Check existing issues first
- Describe the use case
- Provide examples of desired behavior
- Consider Home Assistant API limitations

## 🔄 Pull Request Process

1. **Before submitting:**
   - Ensure code follows style guidelines
   - Test thoroughly with real Home Assistant
   - Update documentation
   - Add entries to changelog if significant

2. **PR Description:**
   - Clear title describing the change
   - Description of what changed and why
   - Link to related issues
   - Screenshots for UI changes

3. **Review Process:**
   - Maintainers will review within a few days
   - Address feedback promptly
   - Ensure CI checks pass

## 📋 Commit Guidelines

### Commit Message Format
```
type: description

Optional longer description
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test additions or changes
- `chore`: Build process or auxiliary tool changes

### Examples
```
feat: add climate control tool with HVAC mode support

fix: handle missing entity attributes gracefully

docs: update README with new automation tools
```

## 🏷️ Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create GitHub release
4. Publish to npm (maintainers only)

## ❓ Questions?

If you have questions:
1. Check existing documentation
2. Search GitHub issues
3. Create a new issue with the "question" label
4. Join community discussions

## 🎉 Recognition

Contributors will be:
- Added to the contributors list
- Credited in release notes
- Invited to help maintain the project (for significant contributions)

Thank you for helping make this project better! 🙏