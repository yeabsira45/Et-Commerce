# Et-Commerce cPanel Deployment Guide

## 🚀 Project Overview
- **Framework**: Next.js 14.2.5 with App Router
- **Database**: MySQL via Prisma ORM
- **Server**: Custom Node.js server with WebSocket support
- **Features**: E-commerce marketplace with real-time chat, file uploads, user authentication

## 📋 Prerequisites
- **Node.js**: Version 18.x or 20.x (required)
- **MySQL**: Database server (cPanel provides this)
- **cPanel**: With Node.js app support
- **Domain/Subdomain**: Configured in cPanel

## 🗄️ Database Setup (cPanel)

### 1. Create MySQL Database
1. Go to **cPanel → MySQL Databases**
2. Create new database: `yourapp_db`
3. Create database user: `yourapp_user`
4. Set password for the user
5. Add user to database with **ALL PRIVILEGES**

### 2. Get Connection Details
- **Host**: Usually `localhost` or `mysql.yourdomain.com`
- **Database**: `yourapp_db`
- **Username**: `yourapp_user`
- **Password**: Your chosen password

### 3. Set DATABASE_URL
```
DATABASE_URL="mysql://yourapp_user:password@localhost:3306/yourapp_db"
```
**Note**: URL-encode special characters in password (@ → %40, etc.)

## 📁 Files to Upload

### Required Files/Folders:
```
server.js
next.config.mjs
package.json
prisma/
app/
components/
lib/
public/
private/ (create empty folder)
types/
.env (production config)
```

### Files to EXCLUDE:
```
.env.local
.env.development
.next/
node_modules/
.git/
*.log
```

## ⚙️ Environment Variables (Production)

Create `.env` file or set in cPanel Node.js app settings:

```bash
DATABASE_URL="mysql://user:pass@host:3306/db"
NODE_ENV=production
APP_URL="https://yourdomain.com"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"
```

## 🛠️ Deployment Steps

### 1. Upload Files
- Upload all required files/folders to your cPanel public_html or subdomain directory
- Ensure `private/uploads` folder exists and is writable (755 permissions)

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Setup
```bash
npx prisma generate
npx prisma migrate deploy
```

### 4. Build Application
```bash
npm run build
```

### 5. Start Application
```bash
npm start
```

## 🌐 cPanel Node.js App Configuration

### 1. Setup Node.js App
1. Go to **cPanel → Setup Node.js App**
2. Create new application:
   - **Application root**: `/home/username/public_html` (or your subdomain path)
   - **Application URL**: `https://yourdomain.com`
   - **Application startup file**: `server.js`

### 2. Environment Variables
Set these in the Node.js app environment variables section:
- `DATABASE_URL`
- `NODE_ENV=production`
- `APP_URL`
- `EMAIL_USER`
- `EMAIL_PASS`

### 3. Application Settings
- **Node.js version**: 18.x or 20.x
- **Application mode**: Production
- **Passenger log file**: Enable for debugging

## 🔧 Post-Deployment Checks

### 1. Test Basic Functionality
- Visit your domain: `https://yourdomain.com`
- Check homepage loads
- Test user registration/login

### 2. Test Database Connection
- Try creating a listing
- Check if listings appear on homepage

### 3. Test File Uploads
- Try uploading images when creating listings
- Verify images appear in listings

### 4. Test Real-time Features
- Test chat/messaging (may not work if WebSockets blocked)
- Check notifications

## 🚨 Common Issues & Solutions

### Database Connection Issues
```bash
# Test connection
npx prisma db pull
```
- Verify DATABASE_URL format
- Check if remote MySQL connections allowed
- Ensure user has proper privileges

### Build Failures
- **Memory issues**: Build locally, upload `.next/` folder
- **Missing dependencies**: Ensure all packages installed
- **Prisma issues**: Run `npx prisma generate` before build

### WebSocket Issues
- cPanel may block WebSockets behind reverse proxy
- Real-time chat may not work
- Consider alternative notification methods

### File Upload Issues
- Ensure `private/uploads` is writable (755)
- Check cPanel upload size limits
- Verify file permissions

### HTTPS/SSL Issues
- Auth cookies require HTTPS
- Enable SSL in cPanel → SSL/TLS
- Use Let's Encrypt for free SSL

## 📊 Performance Optimization

### 1. Memory Management
- Monitor Node.js memory usage
- Consider upgrading cPanel plan if needed

### 2. Database Optimization
- Enable MySQL query caching
- Monitor slow queries
- Consider database indexing

### 3. File Storage
- Monitor upload folder size
- Implement file cleanup if needed
- Consider CDN for static assets

## 🔄 Updates & Maintenance

### Code Updates
1. Upload new files
2. Run `npm install` (if dependencies changed)
3. Run `npm run build`
4. Restart Node.js app in cPanel

### Database Updates
1. Upload new migration files
2. Run `npx prisma migrate deploy`

### Monitoring
- Check cPanel error logs
- Monitor database connections
- Watch for memory/CPU usage

## 📞 Support & Troubleshooting

If issues persist:
1. Check cPanel error logs
2. Verify all environment variables
3. Test database connectivity
4. Check file permissions
5. Review Node.js app logs in cPanel

## ✅ Final Checklist

- [ ] MySQL database created and configured
- [ ] Environment variables set correctly
- [ ] Files uploaded to correct directory
- [ ] Dependencies installed (`npm install`)
- [ ] Prisma client generated (`npx prisma generate`)
- [ ] Database migrated (`npx prisma migrate deploy`)
- [ ] Application built (`npm run build`)
- [ ] Node.js app configured in cPanel
- [ ] Domain/subdomain pointed correctly
- [ ] SSL/HTTPS enabled
- [ ] Basic functionality tested
- [ ] File uploads tested
- [ ] Real-time features tested (if applicable)

---

**Note**: This guide assumes standard cPanel setup. Your hosting provider may have specific requirements or limitations. Always backup your data before deployment.