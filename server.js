const express = require('express');
const app = express();
const cors = require('cors');

require('dotenv').config();

function getApp(sql){
    express.urlencoded({ extended : false });

    app.use(express.json());
    app.use(cors({
        origin: "*",
        credential: true
    }));

    app.get('/userInfo', async (req, res) => {
        const stuid = req.query.stuid;

        if (!stuid) return;

        let results = {};

        const userData = await sql.query(`
            SELECT * FROM IDBIusers
            WHERE jshsus = "${stuid}"
        `, {onlyVal: true, oneData: true});
        
        if (userData.length === 0){
            res.json({name: "", stuid: 0});
            return;
        }

        const userStamps = await sql.query(`
            SELECT * FROM IDBIstamps
            WHERE attendant = ${userData.id}
        `, {onlyVal: true});

        results.userData = userData;
        results.userStamps = userStamps;

        res.json(results);
        
        return;
    });

    app.get('/boothInfo', async (req, res) => {
        const results = await sql.query(`
            SELECT * FROM IDBIbooths
        `, {onlyVal: true});

        res.json(results);

        return;
    });

    app.get('/attendantInfo', async (req, res) => {
        const results = await sql.query(`
            SELECT * FROM IDBIusers
            WHERE level = 0
            ORDER BY stuid ASC;
        `, {onlyVal: true});

        res.json(results);

        return;
    });

    return app;
}

module.exports = getApp;