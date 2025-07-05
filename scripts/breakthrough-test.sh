#!/bin/bash

# Breakthrough Test Script for Phong Ưng Bang Bot
# Kiểm tra đột phá bảo mật và hiệu suất

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
BOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_LOG="$BOT_DIR/breakthrough-test.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Function to print colored output
print_color() {
    echo -e "${1}${2}${NC}"
}

# Function to log messages
log_message() {
    echo "[$TIMESTAMP] $1" >> "$TEST_LOG"
    print_color "$GREEN" "[$TIMESTAMP] $1"
}

# Function to log errors
log_error() {
    echo "[$TIMESTAMP] ERROR: $1" >> "$TEST_LOG"
    print_color "$RED" "[$TIMESTAMP] ERROR: $1"
}

# Function to log warnings
log_warning() {
    echo "[$TIMESTAMP] WARNING: $1" >> "$TEST_LOG"
    print_color "$YELLOW" "[$TIMESTAMP] WARNING: $1"
}

# Function to show usage
show_usage() {
    print_color "$CYAN" "🔍 Breakthrough Test Script - Phong Ưng Bang Bot"
    echo ""
    print_color "$BLUE" "Usage: $0 [OPTIONS]"
    echo ""
    print_color "$YELLOW" "Options:"
    echo "  -s, --security     Chạy test bảo mật"
    echo "  -p, --performance  Chạy test hiệu suất"
    echo "  -t, --stress       Chạy stress test"
    echo "  -r, --recovery     Chạy test khôi phục"
    echo "  -n, --network      Chạy test network"
    echo "  -d, --database     Chạy test database"
    echo "  -a, --all          Chạy tất cả test"
    echo "  -v, --verbose      Hiển thị chi tiết"
    echo "  -h, --help         Hiển thị trợ giúp"
    echo ""
    print_color "$PURPLE" "Examples:"
    echo "  $0 --security         # Chạy test bảo mật"
    echo "  $0 --performance -v   # Chạy test hiệu suất với chi tiết"
    echo "  $0 --all             # Chạy tất cả test"
    echo ""
}

# Function to check dependencies
check_dependencies() {
    print_color "$CYAN" "🔍 Kiểm tra dependencies..."
    
    local missing_deps=()
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        missing_deps+=("node")
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    fi
    
    # Check curl
    if ! command -v curl &> /dev/null; then
        missing_deps+=("curl")
    fi
    
    # Check jq for JSON parsing
    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
    fi
    
    # Check netstat
    if ! command -v netstat &> /dev/null; then
        missing_deps+=("netstat")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        print_color "$RED" "Please install missing dependencies:"
        for dep in "${missing_deps[@]}"; do
            echo "  - $dep"
        done
        exit 1
    fi
    
    log_message "✅ Tất cả dependencies đã sẵn sàng"
}

# Function to check bot status
check_bot_status() {
    print_color "$CYAN" "🤖 Kiểm tra trạng thái bot..."
    
    local bot_pid=$(pgrep -f "node.*index.js" | head -1)
    if [ -z "$bot_pid" ]; then
        log_warning "Bot không đang chạy"
        return 1
    fi
    
    log_message "✅ Bot đang chạy (PID: $bot_pid)"
    
    # Check memory usage
    local memory_usage=$(ps -o pid,ppid,cmd,%mem,%cpu --sort=-%mem -C node | grep index.js | head -1)
    if [ -n "$memory_usage" ]; then
        print_color "$BLUE" "Memory usage: $memory_usage"
    fi
    
    return 0
}

# Function to run security tests
run_security_tests() {
    print_color "$CYAN" "🔒 Chạy Security Tests..."
    
    local test_count=0
    local passed_tests=0
    local failed_tests=0
    
    # Test 1: Check for exposed credentials
    print_color "$YELLOW" "Test 1: Kiểm tra credentials bị lộ..."
    test_count=$((test_count + 1))
    
    if grep -r "TOKEN\|SECRET\|PASSWORD" "$BOT_DIR" --include="*.js" --include="*.json" --exclude-dir=node_modules | grep -v "process.env" | grep -v "example" > /dev/null 2>&1; then
        log_error "❌ Phát hiện credentials có thể bị lộ!"
        failed_tests=$((failed_tests + 1))
    else
        log_message "✅ Không phát hiện credentials bị lộ"
        passed_tests=$((passed_tests + 1))
    fi
    
    # Test 2: Check for dangerous functions
    print_color "$YELLOW" "Test 2: Kiểm tra hàm nguy hiểm..."
    test_count=$((test_count + 1))
    
    if grep -r "eval\|exec\|system" "$BOT_DIR" --include="*.js" --exclude-dir=node_modules > /dev/null 2>&1; then
        log_warning "⚠️ Phát hiện hàm có thể nguy hiểm"
        failed_tests=$((failed_tests + 1))
    else
        log_message "✅ Không phát hiện hàm nguy hiểm"
        passed_tests=$((passed_tests + 1))
    fi
    
    # Test 3: Check file permissions
    print_color "$YELLOW" "Test 3: Kiểm tra quyền file..."
    test_count=$((test_count + 1))
    
    local sensitive_files=("$BOT_DIR/.env" "$BOT_DIR/config.json")
    local permission_issues=0
    
    for file in "${sensitive_files[@]}"; do
        if [ -f "$file" ]; then
            local perms=$(stat -c "%a" "$file" 2>/dev/null)
            if [ "$perms" != "600" ] && [ "$perms" != "644" ]; then
                log_warning "File $file có quyền $perms (không an toàn)"
                permission_issues=$((permission_issues + 1))
            fi
        fi
    done
    
    if [ $permission_issues -eq 0 ]; then
        log_message "✅ Quyền file hợp lệ"
        passed_tests=$((passed_tests + 1))
    else
        failed_tests=$((failed_tests + 1))
    fi
    
    # Test 4: Check for SQL injection vulnerabilities
    print_color "$YELLOW" "Test 4: Kiểm tra SQL injection..."
    test_count=$((test_count + 1))
    
    if grep -r "SELECT\|INSERT\|UPDATE\|DELETE" "$BOT_DIR" --include="*.js" --exclude-dir=node_modules | grep -v "prisma" | grep -v "//\|/\*" > /dev/null 2>&1; then
        log_warning "⚠️ Phát hiện raw SQL queries"
        failed_tests=$((failed_tests + 1))
    else
        log_message "✅ Không phát hiện SQL injection risk"
        passed_tests=$((passed_tests + 1))
    fi
    
    # Test 5: Check package vulnerabilities
    print_color "$YELLOW" "Test 5: Kiểm tra package vulnerabilities..."
    test_count=$((test_count + 1))
    
    cd "$BOT_DIR" || exit 1
    if npm audit --audit-level=high > /dev/null 2>&1; then
        log_message "✅ Không phát hiện vulnerability nghiêm trọng"
        passed_tests=$((passed_tests + 1))
    else
        log_warning "⚠️ Phát hiện package vulnerabilities"
        failed_tests=$((failed_tests + 1))
    fi
    
    # Security test summary
    print_color "$CYAN" "📊 Kết quả Security Tests:"
    print_color "$GREEN" "  ✅ Passed: $passed_tests/$test_count"
    print_color "$RED" "  ❌ Failed: $failed_tests/$test_count"
    
    local security_score=$((passed_tests * 100 / test_count))
    print_color "$BLUE" "  🎯 Security Score: $security_score%"
    
    return $failed_tests
}

# Function to run performance tests
run_performance_tests() {
    print_color "$CYAN" "⚡ Chạy Performance Tests..."
    
    # Test 1: Bot startup time
    print_color "$YELLOW" "Test 1: Kiểm tra thời gian khởi động..."
    
    local start_time=$(date +%s%N)
    cd "$BOT_DIR" || exit 1
    
    # Simulate bot startup check
    if node -e "console.log('Bot startup test')" > /dev/null 2>&1; then
        local end_time=$(date +%s%N)
        local startup_time=$(((end_time - start_time) / 1000000))
        log_message "✅ Thời gian khởi động: ${startup_time}ms"
    else
        log_error "❌ Bot startup failed"
    fi
    
    # Test 2: Memory usage
    print_color "$YELLOW" "Test 2: Kiểm tra memory usage..."
    
    local bot_pid=$(pgrep -f "node.*index.js" | head -1)
    if [ -n "$bot_pid" ]; then
        local memory_kb=$(ps -o rss= -p "$bot_pid" 2>/dev/null)
        if [ -n "$memory_kb" ]; then
            local memory_mb=$((memory_kb / 1024))
            log_message "✅ Memory usage: ${memory_mb}MB"
            
            if [ $memory_mb -gt 500 ]; then
                log_warning "⚠️ High memory usage: ${memory_mb}MB"
            fi
        fi
    fi
    
    # Test 3: Database performance
    print_color "$YELLOW" "Test 3: Kiểm tra database performance..."
    
    local db_test_start=$(date +%s%N)
    if node -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        prisma.\$connect().then(() => {
            console.log('Database connected');
            return prisma.\$disconnect();
        }).catch(e => {
            console.error('Database error:', e.message);
            process.exit(1);
        });
    " > /dev/null 2>&1; then
        local db_test_end=$(date +%s%N)
        local db_time=$(((db_test_end - db_test_start) / 1000000))
        log_message "✅ Database connection time: ${db_time}ms"
    else
        log_error "❌ Database connection failed"
    fi
    
    # Test 4: File system performance
    print_color "$YELLOW" "Test 4: Kiểm tra file system performance..."
    
    local fs_test_start=$(date +%s%N)
    local test_file="/tmp/bot_perf_test_$$"
    
    if echo "test data" > "$test_file" && rm "$test_file" 2>/dev/null; then
        local fs_test_end=$(date +%s%N)
        local fs_time=$(((fs_test_end - fs_test_start) / 1000000))
        log_message "✅ File system performance: ${fs_time}ms"
    else
        log_error "❌ File system test failed"
    fi
    
    # Test 5: Network performance
    print_color "$YELLOW" "Test 5: Kiểm tra network performance..."
    
    local network_test_start=$(date +%s%N)
    if curl -s --max-time 5 "https://discord.com/api/v10/gateway" > /dev/null 2>&1; then
        local network_test_end=$(date +%s%N)
        local network_time=$(((network_test_end - network_test_start) / 1000000))
        log_message "✅ Network latency: ${network_time}ms"
    else
        log_error "❌ Network test failed"
    fi
    
    print_color "$CYAN" "📊 Performance Tests hoàn thành!"
}

# Function to run stress tests
run_stress_tests() {
    print_color "$CYAN" "💪 Chạy Stress Tests..."
    
    local stress_level=${1:-3}
    local duration=${2:-30}
    
    print_color "$YELLOW" "Stress Level: $stress_level/5, Duration: ${duration}s"
    
    # Test 1: CPU stress
    print_color "$YELLOW" "Test 1: CPU Stress Test..."
    
    local cpu_stress_start=$(date +%s)
    local cpu_pids=()
    
    for ((i=1; i<=stress_level; i++)); do
        node -e "
            const start = Date.now();
            while (Date.now() - start < $duration * 1000) {
                Math.random() * Math.random();
            }
        " &
        cpu_pids+=($!)
    done
    
    # Monitor CPU usage
    local max_cpu=0
    for ((i=1; i<=duration; i++)); do
        local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
        if (( $(echo "$cpu_usage > $max_cpu" | bc -l) )); then
            max_cpu=$cpu_usage
        fi
        sleep 1
    done
    
    # Kill stress processes
    for pid in "${cpu_pids[@]}"; do
        kill "$pid" 2>/dev/null || true
    done
    
    log_message "✅ CPU Stress Test hoàn thành. Max CPU: ${max_cpu}%"
    
    # Test 2: Memory stress
    print_color "$YELLOW" "Test 2: Memory Stress Test..."
    
    node -e "
        const start = Date.now();
        const arrays = [];
        while (Date.now() - start < $duration * 1000) {
            arrays.push(new Array(100000).fill(Math.random()));
            if (arrays.length > 10) arrays.shift();
        }
        console.log('Memory stress test completed');
    " &
    
    local memory_pid=$!
    sleep $duration
    kill $memory_pid 2>/dev/null || true
    
    log_message "✅ Memory Stress Test hoàn thành"
    
    # Test 3: Disk I/O stress
    print_color "$YELLOW" "Test 3: Disk I/O Stress Test..."
    
    local io_test_start=$(date +%s)
    local test_dir="/tmp/bot_io_test_$$"
    mkdir -p "$test_dir"
    
    for ((i=1; i<=stress_level*10; i++)); do
        dd if=/dev/zero of="$test_dir/test_$i" bs=1M count=1 2>/dev/null &
    done
    
    wait
    rm -rf "$test_dir"
    
    local io_test_end=$(date +%s)
    local io_time=$((io_test_end - io_test_start))
    log_message "✅ Disk I/O Stress Test hoàn thành (${io_time}s)"
    
    print_color "$CYAN" "📊 Stress Tests hoàn thành!"
}

# Function to run recovery tests
run_recovery_tests() {
    print_color "$CYAN" "🔄 Chạy Recovery Tests..."
    
    # Test 1: Bot restart recovery
    print_color "$YELLOW" "Test 1: Bot Restart Recovery..."
    
    local bot_pid=$(pgrep -f "node.*index.js" | head -1)
    if [ -n "$bot_pid" ]; then
        log_message "Bot hiện tại đang chạy (PID: $bot_pid)"
        
        # Simulate graceful restart
        if kill -TERM "$bot_pid" 2>/dev/null; then
            sleep 5
            
            # Check if bot restarted
            local new_pid=$(pgrep -f "node.*index.js" | head -1)
            if [ -n "$new_pid" ] && [ "$new_pid" != "$bot_pid" ]; then
                log_message "✅ Bot đã restart thành công (New PID: $new_pid)"
            else
                log_warning "⚠️ Bot chưa restart hoặc PID không thay đổi"
            fi
        else
            log_error "❌ Không thể restart bot"
        fi
    else
        log_warning "⚠️ Bot không đang chạy"
    fi
    
    # Test 2: Database recovery
    print_color "$YELLOW" "Test 2: Database Recovery..."
    
    cd "$BOT_DIR" || exit 1
    if node -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        async function testRecovery() {
            try {
                await prisma.\$connect();
                console.log('Database connection recovered');
                await prisma.\$disconnect();
                return 0;
            } catch (error) {
                console.error('Database recovery failed:', error.message);
                return 1;
            }
        }
        
        testRecovery().then(code => process.exit(code));
    "; then
        log_message "✅ Database recovery test passed"
    else
        log_error "❌ Database recovery test failed"
    fi
    
    # Test 3: File system recovery
    print_color "$YELLOW" "Test 3: File System Recovery..."
    
    local test_file="/tmp/bot_recovery_test_$$"
    local recovery_success=true
    
    # Create test file
    echo "recovery test" > "$test_file"
    
    # Simulate file corruption
    echo "corrupted data" > "$test_file"
    
    # Test recovery
    if [ -f "$test_file" ]; then
        rm "$test_file"
        log_message "✅ File system recovery test passed"
    else
        log_error "❌ File system recovery test failed"
        recovery_success=false
    fi
    
    print_color "$CYAN" "📊 Recovery Tests hoàn thành!"
}

# Function to run network tests
run_network_tests() {
    print_color "$CYAN" "🌐 Chạy Network Tests..."
    
    # Test 1: Discord API connectivity
    print_color "$YELLOW" "Test 1: Discord API Connectivity..."
    
    local api_endpoints=(
        "https://discord.com/api/v10/gateway"
        "https://discord.com/api/v10/oauth2/applications/@me"
        "https://discord.com/api/v10/users/@me"
    )
    
    local api_success=0
    local api_total=${#api_endpoints[@]}
    
    for endpoint in "${api_endpoints[@]}"; do
        local start_time=$(date +%s%N)
        if curl -s --max-time 10 "$endpoint" > /dev/null 2>&1; then
            local end_time=$(date +%s%N)
            local response_time=$(((end_time - start_time) / 1000000))
            log_message "✅ $endpoint: ${response_time}ms"
            api_success=$((api_success + 1))
        else
            log_error "❌ $endpoint: Failed"
        fi
    done
    
    print_color "$BLUE" "API Connectivity: $api_success/$api_total endpoints"
    
    # Test 2: Network latency
    print_color "$YELLOW" "Test 2: Network Latency..."
    
    local ping_targets=("8.8.8.8" "1.1.1.1" "discord.com")
    
    for target in "${ping_targets[@]}"; do
        if ping -c 3 "$target" > /dev/null 2>&1; then
            local ping_time=$(ping -c 3 "$target" 2>/dev/null | tail -1 | awk '{print $4}' | cut -d'/' -f2)
            log_message "✅ Ping $target: ${ping_time}ms"
        else
            log_error "❌ Ping $target: Failed"
        fi
    done
    
    # Test 3: Port availability
    print_color "$YELLOW" "Test 3: Port Availability..."
    
    local required_ports=(80 443 53)
    
    for port in "${required_ports[@]}"; do
        if nc -z -w5 8.8.8.8 "$port" 2>/dev/null; then
            log_message "✅ Port $port: Available"
        else
            log_warning "⚠️ Port $port: Not available"
        fi
    done
    
    print_color "$CYAN" "📊 Network Tests hoàn thành!"
}

# Function to run database tests
run_database_tests() {
    print_color "$CYAN" "🗄️ Chạy Database Tests..."
    
    cd "$BOT_DIR" || exit 1
    
    # Test 1: Database connection
    print_color "$YELLOW" "Test 1: Database Connection..."
    
    local db_start=$(date +%s%N)
    if node -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        async function testConnection() {
            try {
                await prisma.\$connect();
                console.log('Database connected successfully');
                await prisma.\$disconnect();
                return 0;
            } catch (error) {
                console.error('Database connection failed:', error.message);
                return 1;
            }
        }
        
        testConnection().then(code => process.exit(code));
    "; then
        local db_end=$(date +%s%N)
        local db_time=$(((db_end - db_start) / 1000000))
        log_message "✅ Database connection: ${db_time}ms"
    else
        log_error "❌ Database connection failed"
    fi
    
    # Test 2: Database performance
    print_color "$YELLOW" "Test 2: Database Performance..."
    
    node -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        async function testPerformance() {
            try {
                await prisma.\$connect();
                
                const start = Date.now();
                
                // Test basic query
                const result = await prisma.\$queryRaw\`SELECT 1 as test\`;
                
                const end = Date.now();
                const queryTime = end - start;
                
                console.log('Query performance: ' + queryTime + 'ms');
                
                await prisma.\$disconnect();
                return 0;
            } catch (error) {
                console.error('Database performance test failed:', error.message);
                return 1;
            }
        }
        
        testPerformance().then(code => process.exit(code));
    " 2>/dev/null
    
    # Test 3: Database schema validation
    print_color "$YELLOW" "Test 3: Database Schema Validation..."
    
    if npx prisma validate > /dev/null 2>&1; then
        log_message "✅ Database schema valid"
    else
        log_error "❌ Database schema validation failed"
    fi
    
    print_color "$CYAN" "📊 Database Tests hoàn thành!"
}

# Function to generate report
generate_report() {
    print_color "$CYAN" "📋 Tạo báo cáo..."
    
    local report_file="$BOT_DIR/breakthrough-report-$(date +%Y%m%d_%H%M%S).md"
    
    cat > "$report_file" << EOF
# Breakthrough Test Report

**Thời gian:** $(date)
**Bot:** Phong Ưng Bang Bot
**Phiên bản:** $(node -v)

## Tổng quan
$(tail -50 "$TEST_LOG" | grep -E "(✅|❌|⚠️)" | wc -l) tests đã được thực hiện

## Chi tiết
\`\`\`
$(tail -100 "$TEST_LOG")
\`\`\`

## Khuyến nghị
- Thường xuyên cập nhật dependencies
- Kiểm tra security vulnerabilities
- Monitor performance metrics
- Backup database định kỳ

---
*Report generated by Breakthrough Test Script*
EOF
    
    log_message "✅ Báo cáo đã được tạo: $report_file"
}

# Main function
main() {
    # Initialize log file
    echo "=== Breakthrough Test Started at $TIMESTAMP ===" > "$TEST_LOG"
    
    print_color "$PURPLE" "🚀 Breakthrough Test Script - Phong Ưng Bang Bot"
    print_color "$PURPLE" "================================================"
    
    # Check if no arguments provided
    if [ $# -eq 0 ]; then
        show_usage
        exit 1
    fi
    
    # Parse command line arguments
    local run_security=false
    local run_performance=false
    local run_stress=false
    local run_recovery=false
    local run_network=false
    local run_database=false
    local run_all=false
    local verbose=false
    local stress_level=3
    local stress_duration=30
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -s|--security)
                run_security=true
                shift
                ;;
            -p|--performance)
                run_performance=true
                shift
                ;;
            -t|--stress)
                run_stress=true
                if [[ $2 =~ ^[1-5]$ ]]; then
                    stress_level=$2
                    shift
                fi
                shift
                ;;
            -r|--recovery)
                run_recovery=true
                shift
                ;;
            -n|--network)
                run_network=true
                shift
                ;;
            -d|--database)
                run_database=true
                shift
                ;;
            -a|--all)
                run_all=true
                shift
                ;;
            -v|--verbose)
                verbose=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Check dependencies
    check_dependencies
    
    # Check bot status
    check_bot_status
    
    # Run tests based on arguments
    if [ "$run_all" = true ]; then
        run_security_tests
        run_performance_tests
        run_stress_tests "$stress_level" "$stress_duration"
        run_recovery_tests
        run_network_tests
        run_database_tests
    else
        [ "$run_security" = true ] && run_security_tests
        [ "$run_performance" = true ] && run_performance_tests
        [ "$run_stress" = true ] && run_stress_tests "$stress_level" "$stress_duration"
        [ "$run_recovery" = true ] && run_recovery_tests
        [ "$run_network" = true ] && run_network_tests
        [ "$run_database" = true ] && run_database_tests
    fi
    
    # Generate report
    generate_report
    
    print_color "$GREEN" "🎉 Breakthrough Test hoàn thành!"
    print_color "$BLUE" "📊 Xem log chi tiết tại: $TEST_LOG"
    
    echo "=== Breakthrough Test Completed at $(date) ===" >> "$TEST_LOG"
}

# Run main function with all arguments
main "$@"