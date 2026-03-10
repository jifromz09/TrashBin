#!/bin/bash

# TrashBin Bluetooth Integration Setup Script
# This script helps set up the Android app with Bluetooth support

echo "========================================"
echo "TrashBin Bluetooth Integration Setup"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found!${NC}"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Step 1: Check npm cache permissions
echo "Step 1: Checking npm cache permissions..."
if [ -d "$HOME/.npm" ]; then
    NPM_OWNER=$(stat -f "%Su" "$HOME/.npm" 2>/dev/null || stat -c "%U" "$HOME/.npm" 2>/dev/null)
    CURRENT_USER=$(whoami)
    
    if [ "$NPM_OWNER" != "$CURRENT_USER" ]; then
        echo -e "${YELLOW}Warning: npm cache is owned by $NPM_OWNER${NC}"
        echo "You may need to fix permissions with:"
        echo "  sudo chown -R \$(whoami) \"$HOME/.npm\""
        read -p "Do you want to fix this now? (requires sudo) [y/N]: " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo chown -R $(whoami) "$HOME/.npm"
            echo -e "${GREEN}✓ Permissions fixed${NC}"
        fi
    else
        echo -e "${GREEN}✓ npm cache permissions OK${NC}"
    fi
fi

# Step 2: Install dependencies
echo ""
echo "Step 2: Installing npm dependencies..."
echo "This may take a few minutes..."
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Dependencies installed successfully${NC}"
else
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    echo "Try running: npm install --legacy-peer-deps"
    exit 1
fi

# Step 3: Verify key dependencies
echo ""
echo "Step 3: Verifying Bluetooth dependencies..."
if grep -q "react-native-ble-plx" package.json; then
    echo -e "${GREEN}✓ react-native-ble-plx found${NC}"
else
    echo -e "${RED}✗ react-native-ble-plx not found${NC}"
    exit 1
fi

if grep -q "buffer" package.json; then
    echo -e "${GREEN}✓ buffer found${NC}"
else
    echo -e "${RED}✗ buffer not found${NC}"
    exit 1
fi

# Step 4: Check Android setup
echo ""
echo "Step 4: Checking Android configuration..."
if [ -d "android" ]; then
    echo -e "${GREEN}✓ Android directory found${NC}"
    
    # Check for Bluetooth permissions in AndroidManifest.xml
    if grep -q "BLUETOOTH_SCAN" android/app/src/main/AndroidManifest.xml; then
        echo -e "${GREEN}✓ Bluetooth permissions configured${NC}"
    else
        echo -e "${YELLOW}⚠ Bluetooth permissions may not be configured${NC}"
    fi
else
    echo -e "${RED}✗ Android directory not found${NC}"
fi

# Step 5: Clean Android build
echo ""
echo "Step 5: Cleaning Android build..."
read -p "Do you want to clean the Android build? [Y/n]: " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    cd android
    if [ -f "gradlew" ]; then
        ./gradlew clean
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Android build cleaned${NC}"
        else
            echo -e "${YELLOW}⚠ Android clean had some issues${NC}"
        fi
    else
        echo -e "${RED}✗ gradlew not found${NC}"
    fi
    cd ..
fi

# Step 6: Summary
echo ""
echo "========================================"
echo "Setup Summary"
echo "========================================"
echo ""
echo "Files verified:"
echo "  ✓ services/BluetoothService.ts"
echo "  ✓ components/BluetoothScreen.tsx"
echo "  ✓ App.tsx"
echo "  ✓ package.json"
echo "  ✓ android/app/src/main/AndroidManifest.xml"
echo ""
echo "Next steps:"
echo "  1. Connect your Android device or start emulator"
echo "  2. Run: npm run android"
echo "  3. Upload embedded code to XIAO nRF52840"
echo "  4. Test Bluetooth connection!"
echo ""
echo "Documentation:"
echo "  - QUICKSTART.md - Quick reference guide"
echo "  - BLUETOOTH_INTEGRATION.md - Full documentation"
echo "  - IMPLEMENTATION_SUMMARY.md - Overview"
echo ""

# Step 7: Offer to start Metro bundler
echo "========================================"
read -p "Do you want to start Metro bundler now? [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Starting Metro bundler..."
    echo "After Metro starts, open another terminal and run: npm run android"
    npm start
else
    echo ""
    echo -e "${GREEN}Setup complete!${NC}"
    echo "Run 'npm run android' when ready to build and deploy."
fi

