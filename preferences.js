var mongoclient = require("mongodb").MongoClient;

function preferences(app, dbName, uri) {
    // submit preferences (create or update)
    /*
        req.body: {
            uid: string, // user id
            sid: string, // session id
            preferences: {
                // this is up to you designing the questionaare, but the preferences object is an object that matches the categories to their preferred value(s).
                // each key is mapped to an object, indicating the preferred value(s), and the weight of the preference
                // weight is between 0 (not important at all), to 1 (must have)
                // example:
                type: {
                    value: "Cat",
                    weight: "0.4"
                },
                colors: {
                    value: ["white", "orange"],
                    weight: "0.8"
                }
            }
        }

        res {
            ok: boolean, // whether or not the request succeeded
            message?: string // populated when ok = false, is an error message
        }
    */
    app.post('/preferences', (req,res) => {
        if (!req.body || !req.body.uid || !req.body.sid || !req.body.preferences) {
            res.status(400).send({ok: false, message: "Must supply uid, sid, and preferences object"});
            return;
        }
	console.log(uri);
        mongoclient.connect(uri, (err,db) => {
            if (err) {
                res.status(500).send({ok: false, message: "DB connection failed"});
                return;
            }
		var dbo = db.db(dbName);
            dbo.collection('users').find({id: req.body.uid, currentSessionId: req.body.sid}).toArray((err, result) => {
                if (result && result.length !== 0 && new Date(result[0].expDate).getTime() > Date.now()) {
                    let user = result[0];
                    dbo.collection('users').updateOne({id: req.body.uid}, {$set: { preferences: req.body.preferences }}, (err, result2) => {
                        res.status(200).send({ok: true});
                        db.close();
                    });
                }
                else {
                    res.status(200).send({ok: false, message: "Invalid user credentials"});
                    db.close();
                }
            });
        });
    })



    // app.post('/preferences', (req,res) => {
    //     if (!req.body || !req.body.uid || !req.body.sid || !req.body.preferences) {
    //         res.status(400).send({ok: false, message: "Must supply uid, sid, and preferences object"});
    //         return;
    //     }
	// console.log(uri);
    //     mongoclient.connect(uri, (err,db) => {
    //         if (err) {
    //             res.status(500).send({ok: false, message: "DB connection failed"});
    //             return;
    //         }
	// 	var dbo = db.db(dbName);
    //         dbo.collection('users').find({id: req.body.uid, currentSessionId: req.body.sid}).toArray((err, result) => {
    //             if (result && result.length !== 0 ) {
    //                 let user = result[0];
    //                 dbo.collection('users').updateOne(
     //                             {id: req.body.uid}, 
     //                             {$set: { 
//                                  preferences: {
//                                  type:{value:req.body.type,weight:req.body.weight1},
//                                  color:{value:req.body.color,weight:req.body.weight2},
//                                  habits:{value:req.body.habits,weight:req.body.weight3}}}}, (err, result2) => {
    //                     res.status(200).send({ok: true});
    //                     db.close();
    //                 });
    //             }
    //             else {
    //                 res.status(200).send({ok: false, message: "Invalid user credentials"});
    //                 db.close();
    //             }
    //         });
    //     });
    // })
}

module.exports = {
    preferences: preferences
}
