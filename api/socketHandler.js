function CheckValidation(sql){
    async function user(id){
        let valid = true;

        let validation = await sql.query(`
            SELECT * FROM IDBIusers
            WHERE id = ${id}
        `, {onlyVal: true});

        valid = validation.length == 1;

        return {valid, id};
    }

    async function users(id){
        let valid = true;

        for (let i = 0; i < id.length; i++){
            let validation = await sql.query(`
                SELECT * FROM IDBIusers
                WHERE id = ${id[i]}
            `, {onlyVal: true});

            valid = valid && validation.length == 1;
        }

        return {valid, id};
    }

    async function booth(id, operatorID){
        let validation = await sql.query(`
            SELECT * FROM IDBIbooths
            WHERE id = ${id} AND operator = ${operatorID}
        `, {onlyVal: true});

        return {valid: validation.length == 1, id};
    }

    async function addAttendant(userIDs, operatorID, boothID){
        let valid = true;

        for (let i = 0; i < userIDs.length; i++){
            let validation = await sql.query(`
                SELECT * FROM IDBIstamps
                WHERE id = ${userIDs[i]} AND operator = ${operatorID} AND booth = ${boothID}
            `, {onlyVal: true});
    
            valid = valid && validation.length == 0;
        }

        return {valid: valid, userIDs, operatorID, boothID};
    }

    async function removeAttendant(userIDs, operatorID, boothID){
        let valid = true;

        for (let i = 0; i < userIDs.length; i++){
            let validation = await sql.query(`
                SELECT * FROM IDBIstamps
                WHERE id = ${userIDs[i]} AND operator = ${operatorID} AND booth = ${boothID}
            `, {onlyVal: true});
    
            valid = valid && validation.length == 1;
        }

        return {valid: valid, userIDs, operatorID, boothID};
    }

    async function stamp(attendants, operatorID){
        let valid = true;

        for (let i = 0; i < attendants.length; i++){
            let validation = await sql.query(`
                SELECT * FROM IDBIstamps
                WHERE attendant = ${attendants[i]} AND operator = ${operatorID}
            `, {onlyVal: true});

            valid = valid && validation.length == 1;
        }

        return {valid, attendants, operatorID};
    }

    return {user, users, booth, stamp, addAttendant, removeAttendant};
}

const socketHandler = (io, sql) => {
    const attendant = io.of('/attendant');
    const operator = io.of('/operator');
    const admin = io.of('/admin');

    const moment = require('moment');

    const check = new CheckValidation(sql);

    io.on('connection', (socket) => {
        socket.on('ping', (data) => {
            socket.emit({msg: "pong"});
        });
    });

    attendant.on('connection', (socket) => {
        let userID;

        socket.on('login', async (data) => {
            const { id } = data;

            if (!id) return;

            const validation = await check.user(id);

            if (validation.valid){
                userID = validation.id;
                socket.emit('valid', {req: "/login"});
            }
            else socket.emit('invalid', {user: validation});

            return;
        });

        socket.on('update', async (data) => {
            const { attendantID } = data;

            if (!attendantID) return;

            const validation = await check.user(attendantID);

            if (validation.valid && attendantID == userID){
                const userStamp = (await sql.query(`
                    SELECT * FROM IDBIstamps
                    WHERE attendant = ${userID}
                `, {onlyVal: true}));

                socket.emit('yourstamp', {userStamp});
            }
            else socket.emit('invalid', {user: validation});
        });
    });

    operator.on('connection', (socket) => {
        let userID;

        socket.on('login', async (data) => {
            const { id } = data;

            if (!id) return;

            const validation = await check.user(id);

            if (validation.valid){
                userID = validation.id;
                socket.emit('valid', {req: "/login"});
            }
            else socket.emit('invalid', {user: validation});

            return;
        });

        socket.on('myInfo', async (data) => {
            const { operatorID } = data;

            if (!(operatorID)) return;

            const operator_validation = await check.user(operatorID);

            if (operator_validation){
                const booth = await sql.query(`
                    SELECT * FROM IDBIbooths
                    WHERE operator = ${operatorID}
                `, {onlyVal: true, oneData: true});

                const stamps = await sql.query(`
                    SELECT * FROM IDBIstamps
                    WHERE operator = ${operatorID}
                `, {onlyVal: true});

                socket.emit('yourBooth', {
                    stamp: stamps,
                    booth: booth
                });
            }
            else socket.emit('invalid', {attendant: attendant_validation, booth: booth_validation});
        });

        socket.on('stamp', async (data) => {
            const { attendants, operatorID, boothID } = data;

            if (!(attendants && operatorID && boothID)) return;

            const add_attendant_validation = await check.addAttendant(attendants.add, operatorID, boothID);
            const remove_attendant_validation = await check.removeAttendant(attendants.remove, operatorID, boothID);
            const operator_validation = await check.user(operatorID);
            const booth_validation = await check.booth(boothID, operatorID);

            const stamp_validation = await check.stamp(attendants, operatorID);

            if (add_attendant_validation && remove_attendant_validation && operator_validation && booth_validation && stamp_validation){
                let time = moment().format("YYYY-MM-DD HH:mm:ss");

                for (let i = 0; i < attendants.add.length; i++){
                    await sql.query(`
                        INSERT INTO IDBIstamps (attendant, operator, time, type, booth)
                        VALUE (${attendants.add[i]}, ${operatorID}, "${time}", ${0}, ${boothID})
                    `);
                }

                for (let i = 0; i < attendants.remove.length; i++){
                    await sql.query(`
                        DELETE FROM IDBIstamps
                        WHERE attendant = ${attendants.remove[i]} AND operator = ${operatorID} AND booth = ${boothID}
                    `);
                }

                attendant.emit('stamped', {attendant: attendants});
            }
            else socket.emit('invalid', {attendant: [add_attendant_validation, remove_attendant_validation], booth: booth_validation});
        });
    });

    admin.on('connection', (socket) => {
        let userID;

        socket.on('login', async (data) => {
            const { id } = data;

            if (!id) return;

            const validation = await check.user(id);

            if (validation.valid){
                userID = validation.id;
                socket.emit('valid', {req: "/login"});
            }
            else socket.emit('invalid', {user: validation});

            return;
        });
    });
};

module.exports = socketHandler;