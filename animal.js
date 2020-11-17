function animalModule(app, dbName) {
    /*
    {
        provId: string,
        provSessionId: string,
        animalInfo: Object (all the animal traits)
    }
    */
    app.post('/animal/add', (req,res) => {
        mongoclient.connect(uri, (err,db) => {
            if (err) {
                res.contentType('application/json').status(500).send('DB connection failed');
                return;
            }
            var dbo = db.db(dbName);
            dbo.collection('users').find({id: req.body.provId, sessionId: req.body.provSessionId}).toArray((err, results) => {
                if (results.length > 0) {
                    animalDoc = Object.assign(userDoc, {
                        // needs: special needs for animal
                        // brand/number: microchip brand/number
                        providerId: req.body.providerId,
                        animalId:idGen.generateSessionId(),
                        name:req.body.name,
                        brand:req.body.brand,
                        number:req.body.number,
                        birth:req.body.birth,
                        gender:req.body.gender,
                        species:req.body.species,
                        breed:req.body.breed,
                        color:req.body.color,
                        size:req.body.size,
                        weight:req.body.weight,
                        declawed:req.body.declawed,
                        location:req.body.location,
                        status:req.body.status,
                        needs:req.body.needs
                    });
                    dbo.collection('animals').insertOne(userDoc, (err,result) => {
                        if (err) throw err;
                        res.status(200).send({ success: true });
                        db.close();
                    });
                }
                else {
                    res.write(JSON.stringify({ok: false, message: "invalid credentials"}));
                    db.close();
                    res.end();
                }
            });
        });
    });
}

module.exports = {
    animal: animalModule
}