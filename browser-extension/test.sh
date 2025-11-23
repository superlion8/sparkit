#!/bin/bash

# Sparkit Mimic 浏览器插件 - 测试脚本
# 用于验证插件功能是否正常工作

echo "================================"
echo "Sparkit Mimic 插件测试脚本"
echo "================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# API 地址
API_URL="https://sparkiai.com"

# 测试计数
PASSED=0
FAILED=0

# 测试函数
test_api() {
    local name=$1
    local endpoint=$2
    local method=${3:-GET}
    
    echo -n "测试 $name ... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL$endpoint")
    fi
    
    if [ "$response" = "200" ] || [ "$response" = "401" ]; then
        echo -e "${GREEN}✓ 通过${NC} (HTTP $response)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ 失败${NC} (HTTP $response)"
        ((FAILED++))
        return 1
    fi
}

echo "1. 测试 API 连接性"
echo "----------------------------"

# 测试健康检查
test_api "健康检查" "/api/health"

# 测试角色列表（需要认证，401 是正常的）
test_api "角色列表" "/api/characters"

# 测试认证验证（需要认证，401 是正常的）
test_api "认证验证" "/api/auth/verify"

echo ""
echo "2. 测试 CORS 配置"
echo "----------------------------"

echo -n "测试 CORS 头 ... "
cors_header=$(curl -s -I "$API_URL/api/health" | grep -i "access-control-allow-origin")

if [ -n "$cors_header" ]; then
    echo -e "${GREEN}✓ 通过${NC}"
    echo "  CORS 头: $cors_header"
    ((PASSED++))
else
    echo -e "${RED}✗ 失败${NC}"
    echo "  未找到 CORS 头，请检查 next.config.js 配置"
    ((FAILED++))
fi

echo ""
echo "3. 测试插件文件"
echo "----------------------------"

# 检查关键文件
files=(
    "manifest.json"
    "background/background.js"
    "content/content-script.js"
    "content/content-script.css"
    "popup/popup.html"
    "popup/popup.js"
    "lib/config.js"
)

for file in "${files[@]}"; do
    echo -n "检查 $file ... "
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ 存在${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ 缺失${NC}"
        ((FAILED++))
    fi
done

echo ""
echo "4. 测试配置"
echo "----------------------------"

echo -n "检查 API 地址配置 ... "
bg_config=$(grep "SPARKIT_API_URL" background/background.js | head -1)
if echo "$bg_config" | grep -q "sparkiai.com"; then
    echo -e "${GREEN}✓ 正确${NC}"
    echo "  配置: $bg_config"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠ 警告${NC}"
    echo "  当前配置: $bg_config"
    echo "  提示: 如果是本地开发，这是正常的"
fi

echo ""
echo "================================"
echo "测试结果汇总"
echo "================================"
echo -e "通过: ${GREEN}$PASSED${NC}"
echo -e "失败: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 所有测试通过！插件可以正常使用。${NC}"
    echo ""
    echo "下一步:"
    echo "1. 在 Chrome 打开 chrome://extensions/"
    echo "2. 启用开发者模式"
    echo "3. 加载已解压的扩展程序"
    echo "4. 选择 $(pwd) 文件夹"
    echo "5. 开始使用 Mimic 功能！"
    exit 0
else
    echo -e "${RED}⚠️ 部分测试失败，请检查上述错误。${NC}"
    echo ""
    echo "常见问题:"
    echo "1. API 连接失败 - 检查网络连接和 API 地址"
    echo "2. CORS 错误 - 检查 next.config.js 的 headers 配置"
    echo "3. 文件缺失 - 确认插件文件完整"
    exit 1
fi

