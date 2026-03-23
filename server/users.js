// users.js — Authorised users for TechTweek CRM
// To change a password: node -e "const b=require('bcryptjs');console.log(b.hashSync('NewPassword',10))"

const USERS = [
  {
    id: 1,
    name: 'Sahil Dubey',
    email: 'sahil@techtweekinfotech.com',
    // Default password: Sahil@1234  (change after first login)
    passwordHash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
    role: 'super_admin',
    avatar: 'SD',
    color: '#D95228',
  },
  {
    id: 2,
    name: 'Vinay Sachdeva',
    email: 'vinay@techtweekinfotech.com',
    // Default password: Vinay@1234
    passwordHash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
    role: 'sales',
    avatar: 'VS',
    color: '#14424F',
  },
  {
    id: 3,
    name: 'Devina Singh',
    email: 'devina@techtweekinfotech.com',
    // Default password: Devina@1234
    passwordHash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
    role: 'sales',
    avatar: 'DS',
    color: '#0B8A5E',
  },
  {
    id: 4,
    name: 'Simran Devi',
    email: 'simran@techtweekinfotech.com',
    // Default password: Simran@1234
    passwordHash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
    role: 'sales',
    avatar: 'SD',
    color: '#6D28D9',
  },
];

// Permissions matrix
const PERMISSIONS = {
  super_admin: {
    canViewAll:       true,   // see all leads regardless of assignment
    canEditAny:       true,   // edit any lead
    canDeleteAny:     true,   // delete any lead
    canManageUsers:   true,   // future: add/remove users
    canSendReminders: true,   // manually trigger reminder emails
    canViewReports:   true,   // full performance dashboard
    canExport:        true,   // export data
  },
  sales: {
    canViewAll:       true,   // can view all leads (read)
    canEditAny:       false,  // can only edit own leads
    canDeleteAny:     false,  // cannot delete
    canManageUsers:   false,
    canSendReminders: false,  // reminders are auto-sent only
    canViewReports:   true,   // can view performance
    canExport:        false,
  },
};

function getUser(email) {
  return USERS.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

function getPermissions(role) {
  return PERMISSIONS[role] || PERMISSIONS.sales;
}

function safeUser(u) {
  const { passwordHash, ...safe } = u;
  return { ...safe, permissions: getPermissions(u.role) };
}

module.exports = { USERS, getUser, getPermissions, safeUser };
