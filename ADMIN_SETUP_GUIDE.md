# Admin Setup Guide

## How to Register as Admin and Test the Admin Dashboard

### Method 1: Using the Admin Setup Page (Recommended for Testing)

1. **Log in to your CampusConnect account**
   - Make sure you're authenticated and logged into the platform

2. **Navigate to the Admin Setup page**
   - Go to: `http://localhost:3000/admin-setup` (or your domain + `/admin-setup`)
   - You'll see a form asking for an admin secret key

3. **Enter the Demo Secret Key**
   - Secret Key: `campus-connect-admin-2024`
   - Click "Grant Admin Access"

4. **Automatic redirect to Admin Dashboard**
   - After successful setup, you'll be automatically redirected to the admin dashboard
   - The sidebar will now show "Admin Dashboard" under the "Admin" section

5. **Access the Admin Dashboard**
   - Click on "Admin Dashboard" in the sidebar
   - Or navigate directly to: `http://localhost:3000/admin`

### Method 2: Manual Database Update (Alternative)

If you prefer to manually set admin privileges:

1. **Access your Firebase Console**
   - Go to your Firebase project
   - Navigate to Firestore Database

2. **Find your user document**
   - Go to the `users` collection
   - Find your user document (using your user ID)

3. **Add admin fields**
   - Add these fields to your user document:
     ```
     role: "admin"
     isAdmin: true
     adminSince: [current timestamp]
     ```

4. **Save and refresh**
   - Save the changes in Firebase
   - Refresh your CampusConnect application

### Method 3: Using the Node.js Script

1. **Install Firebase Admin SDK**
   ```bash
   npm install firebase-admin
   ```

2. **Get Service Account Key**
   - Go to Firebase Console > Project Settings > Service Accounts
   - Generate a new private key and download the JSON file

3. **Update the script**
   - Edit `scripts/setAdminRole.js`
   - Update the path to your service account key
   - Update your project ID
   - Change the email to your email address

4. **Run the script**
   ```bash
   node scripts/setAdminRole.js
   ```

## Testing the Admin Dashboard Features

Once you have admin access, you can test these features:

### 1. Overview Tab
- View platform statistics (users, listings, reports, ratings)
- Monitor pending actions
- Check recent activity

### 2. Pending Listings Tab
- **To test this**: Create a new listing (it will be in "pending" status)
- Approve or reject listings
- View detailed listing information
- Test notification system

### 3. Reported Users Tab
- **To test this**: Use the report functionality in reviews
- View users with reports
- Check report details
- Test user suspension functionality

### 4. Reports Tab
- View platform-wide reporting statistics
- Monitor user status and trends

## Testing the Reporting System

### Test User Reporting:
1. **Create or find a review**
2. **Click the "Report" button** in any review
3. **Fill out the report form**:
   - Select a reason (harassment, fraud, etc.)
   - Provide a detailed description
   - Submit the report

4. **Check the admin dashboard**:
   - Go to "Reported Users" tab
   - You should see the reported user
   - View the report details

### Test Review System:
1. **Leave reviews** on different listings
2. **Check the rating calculations**
3. **Test the "helpful" functionality**
4. **Use the report feature** within reviews

## Important Notes

### Security Considerations:
- The demo secret key method is **only for testing**
- In production, implement proper role-based authentication
- Remove the admin setup page before deploying to production
- Use environment variables for sensitive configuration

### Database Structure:
The admin system uses these Firestore collections:
- `users` - Extended with admin roles
- `reports` - User reports with severity levels
- `admin_notifications` - Admin-specific notifications
- `reviews` - Enhanced review system
- `listings` - With approval workflow

### Troubleshooting:

**Admin Dashboard not showing?**
- Check if the admin role was properly set in your user document
- Refresh the page after setting admin privileges
- Check browser console for any errors

**Can't access admin setup page?**
- Make sure you're logged in first
- Navigate to `/admin-setup` manually
- Check if the route is properly configured

**Reports not showing?**
- Make sure you've submitted some reports first
- Check the Firestore `reports` collection
- Verify the user IDs match correctly

## Demo Workflow

Here's a complete workflow to test all features:

1. **Set up admin access** using Method 1
2. **Create a test listing** (will be pending)
3. **Leave a review** on an existing listing
4. **Report a user** through the review system
5. **Go to admin dashboard** and:
   - Approve/reject the pending listing
   - View the reported user
   - Check platform statistics
6. **Test suspension functionality** on reported users
7. **Verify notifications** are sent to affected users

This comprehensive testing will demonstrate all the admin moderation features implemented in the system.
