const { dbRun, dbGet } = require('./database');
const bcrypt = require('bcryptjs');

(async () => {
    try {
        // Find a user
        const user = await dbGet('SELECT * FROM Usuarios LIMIT 1');
        if (!user) {
            console.log('No user found');
            return;
        }
        console.log('User found:', user.email);
        
        // Update password
        const newPassword = 'newpassword123';
        const hash = await bcrypt.hash(newPassword, 10);
        const result = await dbRun('UPDATE Usuarios SET password_hash = ? WHERE id = ?', [hash, user.id]);
        console.log('Update result:', result);
        
        // Verify
        const updatedUser = await dbGet('SELECT * FROM Usuarios WHERE id = ?', [user.id]);
        const valid = await bcrypt.compare(newPassword, updatedUser.password_hash);
        console.log('Password valid?', valid);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
})();
