require('dotenv').config();
const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const usePostgres = !!process.env.DATABASE_URL;

let db, pool;

if (usePostgres) {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    console.log('Conectado a la base de datos PostgreSQL en la nube.');
    
    // In a real scenario, we should also verify/create schema in Postgres here if it's empty,
    // but typically we can run a separate migration script or assume it's created.
    // For simplicity, we assume the schema is created or we can read a pg-specific schema.sql.
} else {
    const dbPath = path.resolve(__dirname, 'database.sqlite');
    const schemaPath = path.resolve(__dirname, 'schema.sql');
    
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Error abriendo base de datos', err.message);
        } else {
            console.log('Conectado a la base de datos SQLite.');
            db.run('PRAGMA foreign_keys = ON;', (err) => {
                if (err) console.error('Error al habilitar llaves foráneas', err.message);
            });
            
            const schema = fs.readFileSync(schemaPath, 'utf8');
            db.exec(schema, (err) => {
                if (err) {
                    console.error('Error ejecutando el esquema:', err.message);
                } else {
                    console.log('Esquema de base de datos cargado/verificado.');
                }
            });
        }
    });
}

// Translate '?' placeholders to '$1, $2' for Postgres
const convertToPg = (sql) => {
    let index = 1;
    return sql.replace(/\?/g, () => `$${index++}`);
};

const dbRun = async (sql, params = []) => {
    if (usePostgres) {
        // En Postgres, dbRun no devuelve el lastID automáticamente a menos que se use RETURNING, 
        // pero esto es suficiente para la mayoría de actualizaciones.
        const result = await pool.query(convertToPg(sql), params);
        return { changes: result.rowCount };
    } else {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, changes: this.changes });
            });
        });
    }
};

const dbGet = async (sql, params = []) => {
    if (usePostgres) {
        const result = await pool.query(convertToPg(sql), params);
        return result.rows[0];
    } else {
        return new Promise((resolve, reject) => {
            db.get(sql, params, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
    }
};

const dbAll = async (sql, params = []) => {
    if (usePostgres) {
        const result = await pool.query(convertToPg(sql), params);
        return result.rows;
    } else {
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }
};

module.exports = {
    dbRun,
    dbGet,
    dbAll
};
