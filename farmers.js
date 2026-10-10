const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all farmers
router.get('/', async (req, res) => {
    try {
        if (db.pool) {
            const result = await db.query('SELECT * FROM farmers ORDER BY id DESC');
            return res.json({ success: true, count: result.rows.length, farmers: result.rows });
        } else {
            return res.json({ success: true, count: 0, farmers: [] });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET farmer by ID or Code
router.get('/:id', async (req, res) => {
    try {
        if (db.pool) {
            const { id } = req.params;
            const result = await db.query('SELECT * FROM farmers WHERE id = $1 OR farmer_code = $2', [isNaN(id) ? -1 : parseInt(id), id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Farmer not found' });
            }
            return res.json({ success: true, farmer: result.rows[0] });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST Register new Farmer Profile
router.post('/', async (req, res) => {
    const { name, phone, aadhaar, village, landAcres, bankName, bankAcc, ifsc } = req.body;

    if (!name || !phone || !aadhaar) {
        return res.status(400).json({ success: false, message: 'Name, Phone, and Aadhaar are required' });
    }

    const farmerCode = `F-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
        if (db.pool) {
            const result = await db.query(
                `INSERT INTO farmers (farmer_code, name, phone, aadhaar, village, land_acres, bank_name, bank_acc, ifsc, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Verified') RETURNING *`,
                [farmerCode, name, phone, aadhaar, village || 'Rampur', landAcres || 1.0, bankName || 'SBI', bankAcc || '1234567890', ifsc || 'SBIN0001234']
            );
            return res.status(201).json({ success: true, message: 'Farmer registered successfully', farmer: result.rows[0] });
        } else {
            const farmer = { id: Date.now(), farmer_code: farmerCode, name, phone, aadhaar, village, land_acres: landAcres, bank_name: bankName, bank_acc: bankAcc, ifsc, status: 'Verified' };
            return res.status(201).json({ success: true, message: 'Farmer registered (Local)', farmer });
        }
    } catch (err) {
        console.error('Error registering farmer:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
