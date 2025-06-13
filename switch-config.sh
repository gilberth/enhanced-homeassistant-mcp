#!/bin/bash

# Quick switch script for testing different server configurations

show_help() {
    echo "Usage: $0 [minimal|full]"
    echo ""
    echo "Switch between server configurations:"
    echo "  minimal  - Ultra-minimal server (1 tool) for Smithery testing"
    echo "  full     - Full server (25+ tools) with lazy loading"
    echo ""
    echo "Current configuration:"
    grep '"module":' package.json
}

set_minimal() {
    echo "🔄 Switching to minimal configuration..."
    sed -i '' 's/"module": "src\/index.ts"/"module": "src\/minimal-index.ts"/' package.json
    echo "✅ Switched to minimal server (1 tool)"
    echo "📋 Tools available: homeassistant_ping"
}

set_full() {
    echo "🔄 Switching to full configuration..."
    sed -i '' 's/"module": "src\/minimal-index.ts"/"module": "src\/index.ts"/' package.json
    echo "✅ Switched to full server (25+ tools with lazy loading)"
    echo "📋 Tool categories: Basic, Automation, History, Devices, System, Resources"
}

build_and_show() {
    echo ""
    echo "🔨 Building project..."
    npm run build
    
    if [ $? -eq 0 ]; then
        echo "✅ Build successful!"
        echo ""
        echo "📝 Current configuration:"
        grep '"module":' package.json
        echo ""
        echo "🚀 Ready for deployment to Smithery"
    else
        echo "❌ Build failed!"
        exit 1
    fi
}

case "$1" in
    "minimal")
        set_minimal
        build_and_show
        ;;
    "full")
        set_full
        build_and_show
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    "")
        show_help
        ;;
    *)
        echo "❌ Unknown option: $1"
        show_help
        exit 1
        ;;
esac
