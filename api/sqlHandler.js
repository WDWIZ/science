const mysql = require('mysql2');

const env = process.env;

const connection = mysql.createPool({
    host: 'points.jshsus.kr',
    user: 'root',
    password: 'Hello00!',
    database: 'plma',
    multipleStatements: true,
    connectionLimit: 2,
    waitForConnections: true,
    queueLimit: 0,
    keepAliveInitialDelay: 10000, // 0 by default.
    enableKeepAlive: true, // false by default.
});

function SQLHandler(){
    function query(_q, _o = {onlyVal: false, oneData: false}) {
        let options = _o;

        return new Promise((resolve, reject) => {
            connection.query(_q, (error, results, fields) => {
                if (error){
                    console.log(error);
                    reject({
                        status: 500,
                        error: error
                    });
                } else {
                    let res;

                    res = {
                        status: 200,
                        results: results
                    }

                    if (options.oneData) results = results[0];
                    if (options.onlyVal) res = results;

                    resolve(res);
                }
            });
        });
    }

    return { query };
}

module.exports = SQLHandler();