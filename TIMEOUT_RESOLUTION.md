# Smithery Timeout Resolution Strategy

## Problem Analysis

Smithery is experiencing a timeout during tool scanning with the error:

```
Failed to scan tools list from server: McpError: MCP error -32001: Request timed out
```

## Root Cause

The server is registering too many tools (25+ tools across 6 categories) during initialization, causing Smithery's tool scanning to timeout before completion.

## Solution Strategy: Progressive Loading

### Phase 1: Minimal Deployment (Current)

- **File**: `src/minimal-index.ts`
- **Tools**: 1 essential tool (`homeassistant_ping`)
- **Purpose**: Verify Smithery integration works
- **Expected Result**: Successful deployment and tool scanning

### Phase 2: Gradual Expansion

- **File**: `src/index.ts` with lazy loading
- **Tools**: 3 basic tools initially, then progressive loading
- **Strategy**:
  1. Register minimal tools immediately
  2. Load additional tools after 1-second delay
  3. Monitor for timeout issues

### Phase 3: Full Feature Set

- **Tools**: All 25+ tools across 6 categories
- **Strategy**: Implement proper lazy loading per Smithery guidelines

## Implementation Files

### Current Testing Setup

```json
// package.json
"module": "src/minimal-index.ts"  // For Phase 1 testing
```

### Production Setup

```json
// package.json
"module": "src/index.ts"          // For Phase 2/3
```

## Tool Loading Strategies

### Strategy A: Ultra-Minimal (Phase 1)

```typescript
// Only 1 tool for testing
server.tool("homeassistant_ping", ...)
```

### Strategy B: Progressive Loading (Phase 2)

```typescript
// 3 tools immediately
registerMinimalTools(server);

// Remaining tools after delay
setTimeout(() => {
  registerAllOtherTools(server);
}, 1000);
```

### Strategy C: Full Lazy Loading (Phase 3)

```typescript
// Implement proper MCP lazy loading
// Register tools only when first accessed
```

## Testing Process

1. **Deploy Phase 1** (minimal-index.ts)

   - Verify no timeout errors
   - Confirm tool scanning works
   - Test basic connectivity

2. **Switch to Phase 2** (index.ts with delays)

   - Monitor for timeout issues
   - Adjust delay timings if needed
   - Verify progressive loading works

3. **Optimize to Phase 3** (full implementation)
   - Implement proper lazy loading
   - Test all 25+ tools
   - Performance optimization

## Rollback Plan

If any phase fails:

1. Revert package.json to previous working version
2. Redeploy with working configuration
3. Analyze logs and adjust strategy

## Success Metrics

- ✅ No timeout errors during deployment
- ✅ Tool scanning completes successfully
- ✅ All tools become available within 2 seconds
- ✅ Configuration UI displays correctly in Smithery
- ✅ Client connections work properly

## Current Status

- **Phase 1**: Ready for testing (minimal-index.ts)
- **Phase 2**: Implemented with delays (index.ts)
- **Phase 3**: Planned for future optimization

## Next Steps

1. Test Phase 1 deployment
2. Monitor Smithery scanning results
3. Switch to Phase 2 if Phase 1 succeeds
4. Document final working configuration
