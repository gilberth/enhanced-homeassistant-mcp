#!/bin/bash

# Test Docker build script
echo "🐳 Testing Docker build for Enhanced Home Assistant MCP..."

# Build the Docker image
echo "Building Docker image..."
if docker build -t enhanced-homeassistant-mcp-test . ; then
    echo "✅ Docker build successful!"
    
    # Test basic functionality
    echo "🧪 Testing basic functionality..."
    if docker run --rm enhanced-homeassistant-mcp-test node -e "console.log('✅ Node.js working in container')"; then
        echo "✅ Basic Node.js test passed!"
    else
        echo "❌ Basic Node.js test failed!"
        exit 1
    fi
    
    # Check if our compiled code exists
    echo "📁 Checking compiled files..."
    if docker run --rm enhanced-homeassistant-mcp-test ls -la dist/; then
        echo "✅ Compiled files found!"
    else
        echo "❌ Compiled files not found!"
        exit 1
    fi
    
    # Clean up test image
    echo "🧹 Cleaning up test image..."
    docker rmi enhanced-homeassistant-mcp-test
    
    echo "🎉 All tests passed! Docker image is ready for deployment."
else
    echo "❌ Docker build failed!"
    exit 1
fi
