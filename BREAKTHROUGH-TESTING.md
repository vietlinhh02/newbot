# 🔍 Breakthrough Testing Guide - Phong Ưng Bang Bot

Hướng dẫn sử dụng các công cụ kiểm tra đột phá bảo mật và hiệu suất cho Discord Bot.

## 📋 Tổng Quan

Hệ thống breakthrough testing bao gồm:
- **Discord Command**: `/breakthrough` - Kiểm tra từ trong Discord
- **Shell Script**: `breakthrough-test.sh` - Kiểm tra từ command line

## 🤖 Discord Command Usage

### Cú pháp cơ bản
```
/breakthrough <subcommand> [options]
```

### Các subcommands

#### 1. Security Test
```
/breakthrough security type:<test_type>
```
**Các loại test:**
- `spam` - Test spam protection
- `rate` - Test rate limiting
- `perm` - Test permission bypass
- `db` - Test database injection
- `all` - Chạy tất cả security tests

#### 2. Performance Test
```
/breakthrough performance [iterations:<số>] [target:<mục_tiêu>]
```
**Tham số:**
- `iterations` - Số lần test (1-100)
- `target` - Mục tiêu test: `db`, `api`, `commands`, `memory`, `all`

#### 3. Stress Test
```
/breakthrough stress level:<1-5> [duration:<giây>]
```
**Tham số:**
- `level` - Mức độ stress (1-5)
- `duration` - Thời gian test (5-300 giây)

#### 4. Recovery Test
```
/breakthrough recovery scenario:<kịch_bản>
```
**Các kịch bản:**
- `db_disconnect` - Test database recovery
- `api_error` - Test Discord API recovery
- `memory_overflow` - Test memory recovery
- `command_crash` - Test command recovery
- `all` - Chạy tất cả recovery tests

### Ví dụ sử dụng Discord Command

```bash
# Test bảo mật toàn diện
/breakthrough security type:all

# Test hiệu suất database 50 lần
/breakthrough performance iterations:50 target:db

# Stress test mức 4 trong 60 giây
/breakthrough stress level:4 duration:60

# Test recovery database
/breakthrough recovery scenario:db_disconnect
```

## 🖥️ Shell Script Usage

### Cú pháp cơ bản
```bash
./scripts/breakthrough-test.sh [OPTIONS]
```

### Các options

| Option | Mô tả |
|--------|--------|
| `-s, --security` | Chạy test bảo mật |
| `-p, --performance` | Chạy test hiệu suất |
| `-t, --stress [level]` | Chạy stress test |
| `-r, --recovery` | Chạy test khôi phục |
| `-n, --network` | Chạy test network |
| `-d, --database` | Chạy test database |
| `-a, --all` | Chạy tất cả test |
| `-v, --verbose` | Hiển thị chi tiết |
| `-h, --help` | Hiển thị trợ giúp |

### Ví dụ sử dụng Shell Script

```bash
# Chạy test bảo mật
./scripts/breakthrough-test.sh --security

# Chạy test hiệu suất với chi tiết
./scripts/breakthrough-test.sh --performance --verbose

# Chạy stress test mức 3
./scripts/breakthrough-test.sh --stress 3

# Chạy tất cả tests
./scripts/breakthrough-test.sh --all

# Chạy test network và database
./scripts/breakthrough-test.sh --network --database
```

## 🔒 Security Tests

### 1. Exposed Credentials Test
- Kiểm tra credentials bị lộ trong code
- Tìm kiếm TOKEN, SECRET, PASSWORD
- Đảm bảo sử dụng environment variables

### 2. Dangerous Functions Test
- Kiểm tra hàm nguy hiểm: `eval`, `exec`, `system`
- Phát hiện potential code injection

### 3. File Permissions Test
- Kiểm tra quyền file nhạy cảm
- Đảm bảo file config có quyền phù hợp

### 4. SQL Injection Test
- Kiểm tra raw SQL queries
- Đảm bảo sử dụng parameterized queries

### 5. Package Vulnerabilities Test
- Kiểm tra vulnerabilities trong dependencies
- Sử dụng `npm audit`

## ⚡ Performance Tests

### 1. Bot Startup Time
- Đo thời gian khởi động bot
- Kiểm tra tốc độ load commands

### 2. Memory Usage
- Monitor memory consumption
- Phát hiện memory leaks

### 3. Database Performance
- Đo tốc độ kết nối database
- Test query performance

### 4. File System Performance
- Test tốc độ đọc/ghi file
- Kiểm tra I/O performance

### 5. Network Performance
- Test latency đến Discord API
- Kiểm tra network connectivity

## 💪 Stress Tests

### Mức độ Stress:
- **Level 1**: Light stress - Basic operations
- **Level 2**: Medium stress - API calls
- **Level 3**: High stress - Database + API
- **Level 4**: Very high stress - Multiple concurrent operations
- **Level 5**: Maximum stress - Full system load

### Các loại Stress Test:
1. **CPU Stress** - Tải CPU cao
2. **Memory Stress** - Tải memory cao
3. **Disk I/O Stress** - Tải I/O cao

## 🔄 Recovery Tests

### 1. Bot Restart Recovery
- Test khả năng restart bot
- Kiểm tra graceful shutdown

### 2. Database Recovery
- Test kết nối lại database
- Kiểm tra reconnection logic

### 3. Memory Recovery
- Test garbage collection
- Kiểm tra memory cleanup

### 4. Command Recovery
- Test loading commands sau lỗi
- Kiểm tra command integrity

## 🌐 Network Tests

### 1. Discord API Connectivity
- Test kết nối đến Discord API
- Đo response time các endpoints

### 2. Network Latency
- Test ping đến các servers
- Kiểm tra network stability

### 3. Port Availability
- Test các port cần thiết
- Kiểm tra firewall settings

## 🗄️ Database Tests

### 1. Database Connection
- Test kết nối database
- Đo thời gian connection

### 2. Database Performance
- Test query performance
- Kiểm tra tốc độ truy vấn

### 3. Schema Validation
- Validate database schema
- Kiểm tra migration integrity

## 📊 Kết Quả và Báo Cáo

### Discord Command Results
- Hiển thị kết quả trong Discord embed
- Thống kê tổng quan và chi tiết
- Color-coded status indicators

### Shell Script Results
- Log chi tiết tại `breakthrough-test.log`
- Báo cáo markdown tự động
- Real-time colored output

### Metrics Tracking
- Test execution time
- Success/failure rates
- Performance benchmarks
- Security scores

## 🔧 Prerequisites

### Dependencies
- Node.js >= 18.0.0
- npm
- curl
- jq (cho JSON parsing)
- netstat
- bc (cho calculation)

### Bot Requirements
- Bot phải có quyền Administrator
- Database connection configured
- Discord token valid

## 🚀 Quick Start

### 1. Setup
```bash
# Clone repository
git clone <repository>
cd phong-ung-bang-bot

# Install dependencies
npm install

# Setup environment
cp example.env .env
# Edit .env with your values
```

### 2. Discord Command
```bash
# Start bot
npm start

# Use in Discord
/breakthrough security type:all
```

### 3. Shell Script
```bash
# Make executable
chmod +x scripts/breakthrough-test.sh

# Run test
./scripts/breakthrough-test.sh --all
```

## 📈 Best Practices

### Security
- Thường xuyên chạy security tests
- Update dependencies định kỳ
- Monitor vulnerability reports
- Sử dụng environment variables

### Performance
- Chạy performance tests sau updates
- Monitor memory usage
- Optimize database queries
- Track response times

### Monitoring
- Setup automated testing
- Log all test results
- Set up alerts for failures
- Regular security audits

## 🔍 Troubleshooting

### Common Issues

#### Bot Not Running
```bash
# Check process
ps aux | grep node

# Check logs
tail -f breakthrough-test.log

# Restart bot
npm run pm2:restart
```

#### Database Connection Failed
```bash
# Check database status
npx prisma db push

# Test connection
node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.\$connect().then(() => console.log('OK')).catch(console.error)"
```

#### Permission Denied
```bash
# Fix script permissions
chmod +x scripts/breakthrough-test.sh

# Check file permissions
ls -la scripts/
```

## 📞 Support

Nếu gặp vấn đề:
1. Kiểm tra logs tại `breakthrough-test.log`
2. Chạy với `--verbose` để xem chi tiết
3. Đảm bảo tất cả dependencies đã cài đặt
4. Kiểm tra bot permissions trong Discord

---

**Tác giả:** Viet Linh  
**Phiên bản:** 1.0.0  
**Cập nhật:** $(date)