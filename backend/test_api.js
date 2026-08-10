const http = require('http');

const request = (options, body) => new Promise((resolve, reject) => {
    const req = http.request(options, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
});

(async () => {
    try {
        // 1. Login
        console.log('Logging in...');
        const auth = await request({
            hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: 'admin@claro.com', password: 'newpassword123' });
        
        if (auth.status !== 200) throw new Error('Login failed: ' + JSON.stringify(auth.data));
        const token = auth.data.token;
        console.log('Logged in.');

        // 2. Create a test asesor
        console.log('Creating test asesor...');
        const createRes = await request({
            hostname: 'localhost', port: 3000, path: '/api/usuarios', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }
        }, { nombre: 'Test Asesor', email: 'test@claro.com', password: 'password123', rol: 'asesor' });
        
        // 3. Get all asesores
        const usersRes = await request({
            hostname: 'localhost', port: 3000, path: '/api/usuarios', method: 'GET',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const users = usersRes.data;
        const testUser = users.find(u => u.email === 'test@claro.com');
        if (!testUser) throw new Error('Test user not found');
        console.log('Test user created:', testUser.id);

        // 4. Update test asesor
        console.log('Updating test asesor...');
        const updateRes = await request({
            hostname: 'localhost', port: 3000, path: '/api/usuarios/' + testUser.id, method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }
        }, { nombre: 'Updated Asesor', email: 'test@claro.com', password: 'newpassword456', rol: 'asesor' });
        console.log('Update result:', updateRes.data);

        // 5. Verify update by logging in
        console.log('Testing login with new password...');
        const verifyAuth = await request({
            hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: 'test@claro.com', password: 'newpassword456' });
        
        console.log('Login result:', verifyAuth.status, verifyAuth.data);

        // 6. Check if name was updated
        const verifyUsersRes = await request({
            hostname: 'localhost', port: 3000, path: '/api/usuarios', method: 'GET',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const updatedTestUser = verifyUsersRes.data.find(u => u.email === 'test@claro.com');
        console.log('Updated user name:', updatedTestUser.nombre);

        // Cleanup
        await request({
            hostname: 'localhost', port: 3000, path: '/api/usuarios/' + testUser.id, method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
