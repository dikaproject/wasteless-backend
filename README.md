# WasteLess Backend Documentation 🚀

## Setup & Installation

```bash
# Clone repository
git clone https://github.com/dikaproject/wasteless-backend.git
cd wasteless-backend

# Install dependencies
npm install
```

## Environment Variables

Create a `.env` file in the project root with the following configurations:

### Server Configuration
```
PORT=5000
NODE_ENV=development
NEXT_PUBLIC_URL=http://localhost:3000
```

### Database Configuration
```
DB_USER=root
DB_HOST=localhost
DB_NAME=wasteless-project
DB_PASSWORD=
DB_PORT=3306
```

### JWT Configuration
```
JWT_SECRET=your_secret_key
```

### File Upload
```
UPLOAD_PATH=./uploads
```

### CORS Configuration
```
CORS_ORIGIN=http://localhost:3000
```

### Payment Gateway Configuration
```
MIDTRANS_SERVER_KEY=your_midtrans_server_key
MIDTRANS_CLIENT_KEY=your_midtrans_client_key
```

### Email Configuration
```
MAIL_HOST=your_mail_host
MAIL_PORT=your_mail_port
MAIL_USERNAME=your_mail_username
MAIL_PASSWORD=your_mail_password
MAIL_FROM=notifikasi@intechofficial.com
MAIL_FROM_NAME="WasteLess"
MAIL_TO=intechofficialteam@gmail.com
ADMIN_EMAIL=intechofficialteam@gmail.com
```

## Tech Stack

- **Runtime**: Node.js
- **Web Framework**: Express.js
- **Database**: MySQL
- **Authentication**: JSON Web Token (JWT)
- **File Upload**: Multer
- **Email Service**: Nodemailer
  
## Account

Link Demo Website : https://wasteless.intechsosmed.my.id

---
- email : demoadminhackathon2024@gmail.com (Demo Admin)
- passsword : adminhackathon2024
---
- email : intechofficialteam@gmail.com (Demo Seller)
- password : nuha1234
---
- email : dikagilang2007@gmail.com (Demo User)
- password : dika1234

---

## Reminder 
- If error Unhandled Runtime Error ChunkLoadError use **incognito** or **refresh the page**
- Database SQL file is included in the repository - import it to get all existing data
- Product images may not appear for existing products since image files are not pushed to GitHub
  - Best practice: Create new products to ensure images are properly displayed
- Server mirrors our development environment:
  - Some products might show without images
  - For best experience, create new products through the seller dashboard

## Important Notes for Development
- After cloning, create these directories:
  ```bash
  mkdir uploads
  cd uploads
  mkdir products
  mkdir ktp
  mkdir usaha

## Features

### 1. File Upload Management
- Product image uploads
- KTP (Identity Card) verification
- Business photo submissions
- Secure file handling and validation

### 2. Email Notifications
- Automated registration confirmation
- Real-time order status updates
- Seller approval notifications

### 3. Security Implementations
- JWT-based authentication
- Role-based access control
- Secure password hashing
- Comprehensive file validation
- Protection against common web vulnerabilities

### 4. Transaction Management
- Robust MySQL transaction support
- Advanced error handling
- Transaction rollback mechanisms
- Ensure data integrity and consistency

## Additional Resources

### API Dependencies
- **Regional Indonesia API**: [emsifa/api-wilayah-indonesia](https://github.com/emsifa/api-wilayah-indonesia)
  - Provides comprehensive Indonesian region, province, city, and district data

## Project Setup Checklist

### Prerequisites
- Node.js (v14+ recommended)
- MySQL database
- Midtrans account (for payment gateway)
- SMTP email service

### Recommended Development Tools
- Postman (API testing)
- MySQL Workbench
- Visual Studio Code
- Git for version control

## Running the Application

```bash

npm start
```

## Contributors
- [Arya Fathdhillah Adi Saputra](https://github.com/afasarya)
- [Rasya Dika Pratama](https://github.com/dikaproject)
- [Sofwan Nuha Al Faruq](https://github.com/theonlyshannon)

---

## License
- This project is licensed under the [MIT License](LICENSE).